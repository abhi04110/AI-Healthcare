
"""Background job functions for medical knowledge indexing."""

from app.services.rag_service import (
    ingest_medical_documents,
    index_medical_document,
    delete_medical_document_from_index,
)
from app.services.rag_progress import update_rag_job


def _progress(job_id):
    """Create a callback that updates Redis and prints live terminal logs."""

    def callback(percent, stage, message):
        percent = max(1, min(99, int(percent)))

        print(
            f"[RAG PROGRESS] {percent}% | {stage} | {message}",
            flush=True,
        )

        update_rag_job(
            job_id,
            percent,
            stage,
            message,
            status="running",
        )

    return callback


def _start_job(job_id, message):
    print(
        f"[RAG PROGRESS] 1% | Job started | {message}",
        flush=True,
    )

    update_rag_job(
        job_id,
        1,
        "Starting",
        message,
        status="running",
    )


def _complete_job(job_id, message, result):
    update_rag_job(
        job_id,
        100,
        "Completed",
        message,
        status="completed",
        result=result,
    )

    print(
        f"[RAG PROGRESS] 100% | Completed | {message}",
        flush=True,
    )


def _fail_job(job_id, exc):
    error_message = f"{type(exc).__name__}: {exc}"

    update_rag_job(
        job_id,
        100,
        "Failed",
        error_message,
        status="failed",
        error=error_message,
    )

    print(
        f"[RAG ERROR] Job {job_id} failed | {error_message}",
        flush=True,
    )


def run_rag_sync(reason: str = "manual", job_id: str = "unknown") -> dict:
    print(f"[RAG WORKER] Starting sync job {job_id}", flush=True)

    _start_job(
        job_id,
        f"Medical knowledge synchronization started. Reason: {reason}",
    )

    try:
        result = ingest_medical_documents(
            progress_callback=_progress(job_id)
        )

        _complete_job(
            job_id,
            "Medical knowledge synchronization completed successfully.",
            result,
        )

        print(
            f"[RAG WORKER] Finished sync job {job_id}",
            flush=True,
        )

        return result

    except Exception as exc:
        _fail_job(job_id, exc)
        raise


def run_rag_index(filename: str, job_id: str = "unknown") -> dict:
    print(f"[RAG WORKER] Starting indexing job {job_id}", flush=True)

    _start_job(
        job_id,
        f"Document indexing started for: {filename}",
    )

    try:
        result = index_medical_document(
            filename,
            progress_callback=_progress(job_id),
        )

        if result.get("status") == "error":
            raise RuntimeError(
                result.get("error", "Document indexing failed")
            )

        _complete_job(
            job_id,
            f"Document indexing completed for: {filename}",
            result,
        )

        print(
            f"[RAG WORKER] Finished indexing job {job_id}",
            flush=True,
        )

        return result

    except Exception as exc:
        _fail_job(job_id, exc)
        raise


def run_rag_delete(filename: str, job_id: str = "unknown") -> dict:
    print(f"[RAG WORKER] Starting deletion job {job_id}", flush=True)

    _start_job(
        job_id,
        f"Document deletion started for: {filename}",
    )

    try:
        result = delete_medical_document_from_index(filename)

        _complete_job(
            job_id,
            f"Document deletion completed for: {filename}",
            result,
        )

        print(
            f"[RAG WORKER] Finished deletion job {job_id}",
            flush=True,
        )

        return result

    except Exception as exc:
        _fail_job(job_id, exc)
        raise
