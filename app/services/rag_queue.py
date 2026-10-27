
"""Redis-backed queue helpers for RAG indexing."""

from redis import Redis
from redis.exceptions import RedisError
from rq import Queue

from app.config import (
    RAG_JOB_TIMEOUT_SECONDS,
    RAG_QUEUE_NAME,
    REDIS_URL,
)
from app.services.rag_worker import run_rag_sync


def get_redis_connection() -> Redis:
    return Redis.from_url(
        REDIS_URL,
        decode_responses=False,
        socket_connect_timeout=3,
        socket_timeout=5,
        health_check_interval=30,
    )


def enqueue_rag_sync(reason: str = "manual") -> dict:
    """Queue a RAG sync job; avoid adding duplicate queued/running sync jobs."""
    try:
        connection = get_redis_connection()
        connection.ping()

        queue = Queue(
            name=RAG_QUEUE_NAME,
            connection=connection,
            default_timeout=RAG_JOB_TIMEOUT_SECONDS,
        )

        job_id = f"medical-rag-sync-{RAG_QUEUE_NAME}"

        existing = queue.fetch_job(job_id)
        if existing and existing.get_status() in {"queued", "started", "deferred"}:
            return {
                "status": "already_queued",
                "job_id": existing.id,
                "reason": reason,
            }

        job = queue.enqueue(
            run_rag_sync,
            job_id=job_id,
            job_timeout=RAG_JOB_TIMEOUT_SECONDS,
            result_ttl=86400,
            failure_ttl=604800,
            description=f"Medical knowledge sync: {reason}",
        )

        return {
            "status": "queued",
            "job_id": job.id,
            "reason": reason,
        }

    except RedisError as exc:
        raise RuntimeError(
            "Redis is unavailable. Start the Redis service and retry."
        ) from exc
