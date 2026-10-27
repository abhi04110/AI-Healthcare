
"""Background job functions for medical knowledge indexing."""

from app.services.rag_service import ingest_medical_documents


def run_rag_sync() -> dict:
    """Run incremental indexing and return a structured job result."""
    return ingest_medical_documents()
