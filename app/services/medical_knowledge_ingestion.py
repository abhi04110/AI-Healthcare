"""Command-line entry point for indexing trusted medical reference documents.

Run from the project root:
    python -m app.services.medical_knowledge_ingestion
"""

import json

from app.services.rag_service import ingest_medical_documents


if __name__ == "__main__":
    print(json.dumps(ingest_medical_documents(), indent=2, ensure_ascii=False))
