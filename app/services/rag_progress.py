"""Redis-backed progress state and Server-Sent Events for RAG jobs."""
from __future__ import annotations

import json
import time
from typing import Any, Iterator

from redis import Redis
from app.config import REDIS_URL

JOB_TTL_SECONDS = 7 * 24 * 60 * 60


def _redis() -> Redis:
    return Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=3, socket_timeout=5)


def _key(job_id: str) -> str:
    return f"medical_rag:progress:{job_id}"


def update_rag_job(job_id: str, percent: int, stage: str, message: str, status: str = "running", **extra: Any) -> dict:
    percent = max(0, min(100, int(percent)))
    data = {
        "job_id": job_id,
        "status": status,
        "percent": percent,
        "progress_percent": percent,
        "stage": stage,
        "message": message,
        "terminal": status in {"completed", "failed"},
        "updated_at": time.time(),
        **extra,
    }
    client = _redis()
    client.set(_key(job_id), json.dumps(data, ensure_ascii=False), ex=JOB_TTL_SECONDS)
    client.publish(f"medical_rag:events:{job_id}", json.dumps(data, ensure_ascii=False))
    return data


def get_rag_job(job_id: str) -> dict | None:
    raw = _redis().get(_key(job_id))
    return json.loads(raw) if raw else None


def stream_rag_job(job_id: str) -> Iterator[str]:
    client = _redis()
    pubsub = client.pubsub()
    channel = f"medical_rag:events:{job_id}"
    pubsub.subscribe(channel)
    try:
        current = get_rag_job(job_id)
        if current:
            yield f"data: {json.dumps(current, ensure_ascii=False)}\n\n"
            if current.get("terminal"):
                return
        last_ping = time.time()
        while True:
            item = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if item and item.get("data"):
                payload = item["data"]
                yield f"data: {payload}\n\n"
                try:
                    if json.loads(payload).get("terminal"):
                        return
                except (TypeError, ValueError):
                    pass
            if time.time() - last_ping >= 15:
                yield ": keep-alive\n\n"
                last_ping = time.time()
    finally:
        pubsub.close()
