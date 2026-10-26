"""Multiformat local RAG ingestion and retrieval for trusted reference documents.

Supports PDF, TXT, Markdown, Word, Excel, CSV, and common image files. OCR is
used for scanned/image-heavy content when Tesseract is installed. OCR output is
imperfect by nature; sources must be reviewed and answers must cite references.
Patient-specific records remain in the SQL database and existing access controls.
"""

from __future__ import annotations

import csv
import hashlib
import io
import os
import re
import zipfile
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import (
    MEDICAL_KNOWLEDGE_DIR,
    RAG_CHUNK_OVERLAP,
    RAG_CHUNK_SIZE,
    RAG_EMBEDDING_MODEL,
    RAG_TOP_K,
    VECTOR_STORE_DIR,
)

SUPPORTED_EXTENSIONS = {
    ".pdf", ".txt", ".md", ".markdown", ".docx", ".xlsx", ".xls",
    ".csv", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
MAX_EMBEDDED_IMAGE_BYTES = 20 * 1024 * 1024


def _dependencies():
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise RuntimeError(
            "RAG dependencies are missing. Install requirements.txt before using "
            "the Medical Knowledge Assistant."
        ) from exc
    return chromadb, SentenceTransformer


@lru_cache(maxsize=1)
def _embedding_model():
    _, sentence_transformer = _dependencies()
    return sentence_transformer(RAG_EMBEDDING_MODEL)


@lru_cache(maxsize=1)
def _collection():
    chromadb, _ = _dependencies()
    Path(VECTOR_STORE_DIR).mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(VECTOR_STORE_DIR))
    return client.get_or_create_collection(
        name="medical_knowledge",
        metadata={"hnsw:space": "cosine"},
    )


def _ocr_bytes(data: bytes, filename: str = "image") -> str:
    """OCR image bytes with Tesseract; return an actionable error if unavailable."""
    try:
        import pytesseract
        from PIL import Image, ImageOps, ImageEnhance, ImageFilter
        windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(windows_tesseract):
            pytesseract.pytesseract.tesseract_cmd = windows_tesseract
        image = Image.open(io.BytesIO(data)).convert("RGB")
        image = ImageOps.exif_transpose(image)
        # A modest upscale and contrast pass helps common scanned documents.
        if image.width < 1600:
            ratio = min(2.0, 1600 / max(1, image.width))
            image = image.resize((int(image.width * ratio), int(image.height * ratio)))
        image = ImageEnhance.Contrast(image).enhance(1.25).filter(ImageFilter.SHARPEN)
        return pytesseract.image_to_string(image, config="--psm 3").strip()
    except Exception as exc:
        raise RuntimeError(
            f"Could not OCR '{filename}'. Install Tesseract OCR and ensure it is on PATH. "
            f"Details: {type(exc).__name__}: {exc}"
        ) from exc


def _unique_text(native: str, ocr: str) -> str:
    """Keep OCR lines not already present in extracted text, limiting duplicates."""
    native = native.strip()
    ocr_lines = [line.strip() for line in ocr.splitlines() if line.strip()]
    normalized_native = re.sub(r"[^a-z0-9]+", " ", native.lower())
    additions = []
    seen = set()
    for line in ocr_lines:
        normalized = re.sub(r"[^a-z0-9]+", " ", line.lower()).strip()
        if len(normalized) < 3 or normalized in seen:
            continue
        seen.add(normalized)
        # Avoid adding full-page OCR lines that are already represented in PDF text.
        if normalized in normalized_native:
            continue
        additions.append(line)
    return "\n".join(part for part in (native, "\n[OCR text from embedded/scanned content]\n" + "\n".join(additions) if additions else "") if part).strip()


def _read_pdf(path: Path) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    results: list[tuple[int, str]] = []
    for page_number, page in enumerate(reader.pages, start=1):
        native_text = (page.extract_text() or "").strip()
        ocr_parts: list[str] = []
        # Render pages with little/no native text (typical scanned PDFs) and OCR them.
        if len(native_text) < 80:
            try:
                import fitz
                with fitz.open(str(path)) as document:
                    pix = document[page_number - 1].get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
                    ocr_parts.append(_ocr_bytes(pix.tobytes("png"), f"{path.name}, page {page_number}"))
            except ImportError:
                if not native_text:
                    raise RuntimeError("Scanned PDF OCR requires PyMuPDF. Install the updated requirements.txt.")
        # OCR image blocks within mixed text/image PDF pages too (charts, screenshots, embedded tables).
        try:
            import fitz
            with fitz.open(str(path)) as document:
                pdf_page = document[page_number - 1]
                for block in pdf_page.get_text("dict").get("blocks", []):
                    if block.get("type") != 1:
                        continue
                    bbox = block.get("bbox")
                    if not bbox:
                        continue
                    pix = pdf_page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(bbox), alpha=False)
                    if len(pix.samples) <= MAX_EMBEDDED_IMAGE_BYTES:
                        ocr_parts.append(_ocr_bytes(pix.tobytes("png"), f"{path.name}, page {page_number} image"))
        except ImportError:
            # Text-based PDFs can still be read without PyMuPDF; image OCR requires it.
            pass
        combined = native_text
        for ocr_text in ocr_parts:
            combined = _unique_text(combined, ocr_text)
        results.append((page_number, combined))
    return results


def _read_docx(path: Path) -> list[tuple[int, str]]:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("Word DOCX support requires python-docx. Install requirements.txt.") from exc

    document = Document(str(path))
    pieces: list[str] = []
    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            pieces.append(paragraph.text.strip())
    for table_index, table in enumerate(document.tables, start=1):
        pieces.append(f"Table {table_index}:")
        for row in table.rows:
            pieces.append(" | ".join(cell.text.strip().replace("\n", " / ") for cell in row.cells))

    # DOCX is a ZIP container; OCR embedded pictures without altering the original document.
    try:
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                if name.startswith("word/media/") and not name.endswith("/"):
                    data = archive.read(name)
                    if len(data) <= MAX_EMBEDDED_IMAGE_BYTES:
                        try:
                            image_text = _ocr_bytes(data, f"{path.name}:{Path(name).name}")
                            if image_text:
                                pieces.append(f"[OCR from embedded image {Path(name).name}]\n{image_text}")
                        except Exception as exc:
                            pieces.append(f"[Warning: embedded image {Path(name).name} could not be OCR-read: {exc}]")
    except zipfile.BadZipFile as exc:
        raise ValueError(f"'{path.name}' is not a valid DOCX file.") from exc
    return [(1, "\n".join(pieces))]


def _read_excel(path: Path) -> list[tuple[int, str]]:
    try:
        import pandas as pd
        sheets = pd.read_excel(path, sheet_name=None, dtype=str)
    except ImportError as exc:
        raise RuntimeError("Excel support requires pandas/openpyxl and xlrd for old .xls files.") from exc
    except Exception as exc:
        raise RuntimeError(f"Could not read Excel file '{path.name}': {exc}") from exc

    results: list[tuple[int, str]] = []
    for sheet_number, (sheet_name, frame) in enumerate(sheets.items(), start=1):
        frame = frame.fillna("")
        lines = [f"Workbook: {path.name}\nSheet: {sheet_name}"]
        if not frame.empty:
            columns = [str(column) for column in frame.columns]
            lines.append(" | ".join(columns))
            for row in frame.itertuples(index=False, name=None):
                values = [str(value).strip() for value in row]
                if any(values):
                    lines.append(" | ".join(values))
        results.append((sheet_number, "\n".join(lines)))

    # OCR pictures embedded in modern .xlsx files (Excel .xls image extraction is not portable).
    if path.suffix.lower() == ".xlsx":
        try:
            with zipfile.ZipFile(path) as archive:
                for name in archive.namelist():
                    if name.startswith("xl/media/") and not name.endswith("/"):
                        data = archive.read(name)
                        if len(data) <= MAX_EMBEDDED_IMAGE_BYTES:
                            try:
                                image_text = _ocr_bytes(data, f"{path.name}:{Path(name).name}")
                                if image_text:
                                    results.append((len(results) + 1, f"Workbook: {path.name}\nEmbedded image {Path(name).name}\n{image_text}"))
                            except Exception as exc:
                                results.append((len(results) + 1, f"Workbook: {path.name}\n[Warning: embedded image {Path(name).name} OCR failed: {exc}]"))
        except zipfile.BadZipFile as exc:
            raise ValueError(f"'{path.name}' is not a valid XLSX file.") from exc
    return results


def _read_csv(path: Path) -> list[tuple[int, str]]:
    # utf-8-sig handles common Excel-exported CSV files; fall back for legacy Windows files.
    try:
        content = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        content = path.read_text(encoding="cp1252", errors="replace")
    try:
        dialect = csv.Sniffer().sniff(content[:8192], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    rows = list(csv.reader(io.StringIO(content), dialect))
    text = "\n".join(" | ".join(cell.strip() for cell in row) for row in rows if any(cell.strip() for cell in row))
    return [(1, text)]


def _read_document(path: Path) -> list[tuple[int, str]]:
    """Return (page/sheet number, extracted text) pairs for supported files."""
    extension = path.suffix.lower()
    if extension == ".pdf":
        return _read_pdf(path)
    if extension == ".docx":
        return _read_docx(path)
    if extension in {".xlsx", ".xls"}:
        return _read_excel(path)
    if extension == ".csv":
        return _read_csv(path)
    if extension in IMAGE_EXTENSIONS:
        return [(1, _ocr_bytes(path.read_bytes(), path.name))]
    text = path.read_text(encoding="utf-8-sig", errors="replace")
    return [(1, text)]


def _clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_text(text: str) -> list[str]:
    """Split by paragraphs/sentences with overlap; size is measured in characters."""
    text = _clean_text(text)
    if not text:
        return []
    size = max(200, int(RAG_CHUNK_SIZE))
    overlap = max(0, min(int(RAG_CHUNK_OVERLAP), size // 2))
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = max(text.rfind("\n\n", start, end), text.rfind(". ", start, end), text.rfind("? ", start, end), text.rfind("! ", start, end))
            if boundary > start + size // 2:
                end = boundary + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def ingest_medical_documents() -> dict[str, Any]:
    """Index supported files recursively from medical_knowledge/ into ChromaDB."""
    root = Path(MEDICAL_KNOWLEDGE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    files = sorted(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS)
    if not files:
        return {
            "status": "no_documents",
            "message": f"Add supported files ({', '.join(sorted(SUPPORTED_EXTENSIONS))}) to {root} and run ingestion again.",
            "documents_found": 0,
            "chunks_indexed": 0,
        }

    collection = _collection()
    model = _embedding_model()
    total_chunks = 0
    indexed_files = []
    for path in files:
        relative_source = path.relative_to(root).as_posix()
        source_key = hashlib.sha256(relative_source.encode("utf-8")).hexdigest()[:20]
        existing = collection.get(where={"source_key": source_key}, include=["metadatas"])
        if existing.get("ids"):
            collection.delete(ids=existing["ids"])
        try:
            chunks_with_pages: list[tuple[int, str]] = []
            for page_number, page_text in _read_document(path):
                chunks_with_pages.extend((page_number, chunk) for chunk in _split_text(page_text))
            if not chunks_with_pages:
                indexed_files.append({"source": relative_source, "chunks": 0, "status": "empty_text", "warning": "No extractable text found; scanned or encrypted content may need attention."})
                continue
            texts = [chunk for _, chunk in chunks_with_pages]
            vectors = model.encode(texts, normalize_embeddings=True).tolist()
            ids = [hashlib.sha256(f"{source_key}:{index}:{chunk}".encode("utf-8")).hexdigest() for index, chunk in enumerate(texts)]
            metadatas = [{"source": relative_source, "source_key": source_key, "page": int(page_number), "chunk_index": int(index)} for index, (page_number, _) in enumerate(chunks_with_pages)]
            for offset in range(0, len(texts), 100):
                collection.add(ids=ids[offset:offset + 100], documents=texts[offset:offset + 100], embeddings=vectors[offset:offset + 100], metadatas=metadatas[offset:offset + 100])
            total_chunks += len(texts)
            indexed_files.append({"source": relative_source, "chunks": len(texts), "status": "indexed"})
        except Exception as exc:
            indexed_files.append({"source": relative_source, "chunks": 0, "status": "error", "error": f"{type(exc).__name__}: {exc}"})
    failed = [item for item in indexed_files if item["status"] == "error"]
    return {
        "status": "partial_success" if failed else "success",
        "documents_found": len(files),
        "chunks_indexed": total_chunks,
        "files": indexed_files,
        "failed_files": len(failed),
        "vector_store": str(VECTOR_STORE_DIR),
        "embedding_model": RAG_EMBEDDING_MODEL,
        "note": "OCR may misread tables, handwriting, small print, or charts. Verify important passages in the original source.",
    }


def retrieve_medical_knowledge(question: str, top_k: int | None = None) -> list[dict[str, Any]]:
    """Return semantically relevant reference chunks and source metadata."""
    collection = _collection()
    if collection.count() == 0:
        return []
    model = _embedding_model()
    query_vector = model.encode([question], normalize_embeddings=True).tolist()[0]
    result = collection.query(query_embeddings=[query_vector], n_results=max(1, min(int(top_k or RAG_TOP_K), 10)), include=["documents", "metadatas", "distances"])
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    retrieved = []
    for text, metadata, distance in zip(documents, metadatas, distances):
        metadata = metadata or {}
        retrieved.append({"text": text, "source": metadata.get("source", "Unknown source"), "page": metadata.get("page"), "similarity": round(max(0.0, min(1.0, 1.0 - float(distance))), 4)})
    return retrieved


def format_medical_knowledge_context(chunks: list[dict[str, Any]]) -> str:
    if not chunks:
        return "No relevant indexed medical reference passages were found."
    sections = []
    for index, chunk in enumerate(chunks, start=1):
        page = f", page/sheet {chunk['page']}" if chunk.get("page") else ""
        sections.append(f"[Source {index}: {chunk['source']}{page}]\n{chunk['text']}")
    return "\n\n".join(sections)


def list_medical_documents() -> list[dict[str, Any]]:
    """List supported source files and the number of chunks indexed for each file."""
    root = Path(MEDICAL_KNOWLEDGE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    collection = _collection()
    documents: list[dict[str, Any]] = []
    for path in sorted(p for p in root.rglob('*') if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS):
        relative_source = path.relative_to(root).as_posix()
        source_key = hashlib.sha256(relative_source.encode('utf-8')).hexdigest()[:20]
        indexed = collection.get(where={"source_key": source_key}, include=["metadatas"])
        chunk_count = len(indexed.get("ids") or [])
        documents.append({
            "filename": relative_source,
            "size_bytes": path.stat().st_size,
            "indexed_chunks": chunk_count,
            "indexed": chunk_count > 0,
        })
    return documents


def delete_medical_document(filename: str) -> dict[str, Any]:
    """Remove a stored source and all Chroma chunks associated with its relative path."""
    root = Path(MEDICAL_KNOWLEDGE_DIR).resolve()
    requested = Path(filename)
    if requested.is_absolute() or '..' in requested.parts:
        raise ValueError("Filename must be a relative path returned by GET /assistant/knowledge")
    target = (root / requested).resolve()
    if root not in target.parents:
        raise ValueError("Filename must stay inside the medical knowledge directory")
    if not target.is_file() or target.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return {"deleted": False, "filename": filename, "indexed_chunks_deleted": 0}

    relative_source = target.relative_to(root).as_posix()
    source_key = hashlib.sha256(relative_source.encode('utf-8')).hexdigest()[:20]
    collection = _collection()
    indexed = collection.get(where={"source_key": source_key}, include=["metadatas"])
    ids = indexed.get("ids") or []
    if ids:
        collection.delete(ids=ids)
    target.unlink()
    return {
        "deleted": True,
        "filename": relative_source,
        "indexed_chunks_deleted": len(ids),
    }
