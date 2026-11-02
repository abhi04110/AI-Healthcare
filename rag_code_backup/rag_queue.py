
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
    """Queue RAG indexing without allowing stale sync jobs to block uploads."""
    try:
        connection = get_redis_connection()
        connection.ping()

        queue = Queue(
            name=RAG_QUEUE_NAME,
            connection=connection,
            default_timeout=RAG_JOB_TIMEOUT_SECONDS,
        )

        is_upload = reason.startswith("upload:")

        if is_upload:
            # Every uploaded document gets its own independent job.
            job_id = f"medical-rag-upload-{uuid4().hex}"
        else:
            # Keep a stable ID for scheduled/manual full sync jobs.
            job_id = f"medical-rag-sync-{RAG_QUEUE_NAME}"

            existing = queue.fetch_job(job_id)

            if existing:
                status = existing.get_status(refresh=True)

                if status in {"queued", "started", "deferred"}:
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
