
"""Daily reconciliation scheduler for the medical RAG knowledge base."""

import asyncio
import logging

from app.config import RAG_SYNC_INTERVAL_HOURS
from app.services.rag_queue import enqueue_rag_sync

logger = logging.getLogger(__name__)


async def rag_daily_scheduler() -> None:
    """Queue one reconciliation at startup, then repeat every configured interval."""
    interval_seconds = max(1, RAG_SYNC_INTERVAL_HOURS) * 60 * 60

    while True:
        try:
            result = await asyncio.to_thread(
                enqueue_rag_sync,
                "scheduled-daily-sync",
            )
            logger.info("RAG scheduled sync result: %s", result)

        except Exception:
            logger.exception("Could not enqueue scheduled RAG sync")

        await asyncio.sleep(interval_seconds)
