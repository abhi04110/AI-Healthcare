
"""Background job functions for medical knowledge indexing."""

from app.services.rag_service import (
    ingest_medical_documents,
    index_medical_document,
    delete_medical_document_from_index,
)


def run_rag_sync(reason: str = "manual") -> dict:
    """Run a full synchronization of the medical knowledge directory."""
    print(f"[RAG WORKER] Starting full sync: {reason}", flush=True)

    result = ingest_medical_documents()

    print(
        f"[RAG WORKER] Full sync finished: {result.get('status')}",
        flush=True,
    )

    return result


def run_rag_index(filename: str) -> dict:
    """Index one uploaded medical reference document."""
    print(f"[RAG WORKER] Starting document indexing: {filename}", flush=True)

    result = index_medical_document(filename)

    print(
        f"[RAG WORKER] Document indexing finished: "
        f"{filename} | {result.get('status')}",
        flush=True,
    )

    return result


def run_rag_delete(filename: str) -> dict:
    """Delete one document and its vector chunks inside the worker."""
    print(f"[RAG WORKER] Starting document deletion: {filename}", flush=True)

    result = delete_medical_document_from_index(filename)

    print(
        f"[RAG WORKER] Document deletion finished: "
        f"{filename} | {result.get('deleted')}",
        flush=True,
    )

    return result
