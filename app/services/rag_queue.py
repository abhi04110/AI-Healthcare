
"""Redis-backed queue helpers for RAG indexing."""

from uuid import uuid4

from redis import Redis
from redis.exceptions import RedisError
from rq import Queue

from app.config import (
    RAG_JOB_TIMEOUT_SECONDS,
    RAG_QUEUE_NAME,
    REDIS_URL,
)
from app.services.rag_progress import update_rag_job
from app.services.rag_worker import (
    run_rag_sync,
    run_rag_index,
    run_rag_delete,
)


def get_redis_connection() -> Redis:
    return Redis.from_url(
        REDIS_URL,
        decode_responses=False,
        socket_connect_timeout=3,
        socket_timeout=5,
        health_check_interval=30,
    )


def _get_queue() -> Queue:
    connection = get_redis_connection()
    connection.ping()

    return Queue(
        name=RAG_QUEUE_NAME,
        connection=connection,
        default_timeout=RAG_JOB_TIMEOUT_SECONDS,
    )


def _enqueue(function, *args, description: str, job_id: str) -> dict:
    try:
        queue = _get_queue()

        update_rag_job(job_id, 0, "Queued", "Indexing job is waiting for a worker.", status="queued")
        job = queue.enqueue(
            function,
            *args,
            job_id,
            job_id=job_id,
            job_timeout=RAG_JOB_TIMEOUT_SECONDS,
            result_ttl=86400,
            failure_ttl=604800,
            description=description,
        )

        return {
            "status": "queued",
            "job_id": job.id,
            "description": description,
        }

    except RedisError as exc:
        raise RuntimeError(
            "Redis is unavailable. Start Redis and retry."
        ) from exc


def enqueue_rag_index(filename: str) -> dict:
    """Queue indexing for one uploaded document."""
    if not filename or not filename.strip():
        raise ValueError("A document filename is required.")

    return _enqueue(
        run_rag_index,
        filename,
        description=f"Index medical document: {filename}",
        job_id=f"medical-rag-index-{uuid4().hex}",
    )


def enqueue_rag_delete(filename: str) -> dict:
    """Queue deletion of one document and its vector chunks."""
    if not filename or not filename.strip():
        raise ValueError("A document filename is required.")

    return _enqueue(
        run_rag_delete,
        filename,
        description=f"Delete medical document: {filename}",
        job_id=f"medical-rag-delete-{uuid4().hex}",
    )


def enqueue_rag_sync(reason: str = "manual") -> dict:
    """Queue a full medical knowledge synchronization."""
    return _enqueue(
        run_rag_sync,
        reason,
        description=f"Medical knowledge sync: {reason}",
        job_id=f"medical-rag-sync-{uuid4().hex}",
    )
