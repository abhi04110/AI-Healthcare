import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import text

from app.database import SessionLocal
from app.config import ML_RETRAIN_INTERVAL_HOURS
from app.services.ml_service import (
    get_training_data_summary,
    get_model_status,
    train_risk_model,
)

logger = logging.getLogger(__name__)

TRAIN_INTERVAL_SECONDS = ML_RETRAIN_INTERVAL_HOURS * 60 * 60


async def run_scheduled_training_once():
    db = SessionLocal()
    try:
        # PostgreSQL advisory lock prevents duplicate training when more
        # than one application process is running.
        lock_acquired = db.execute(
            text("SELECT pg_try_advisory_lock(845921)")
        ).scalar()

        if not lock_acquired:
            logger.info("ML training skipped: another worker owns the lock")
            return

        try:
            summary = get_training_data_summary(db)
            status = get_model_status()

            if not summary["ready_for_training"]:
                logger.info(
                    "ML training skipped: insufficient labelled data: %s",
                    summary,
                )
                return

            latest_record_id = summary.get("latest_training_record_id")
            trained_record_id = status.get("training_data_max_record_id")

            if status.get("model_exists") and (
                latest_record_id is not None
                and trained_record_id is not None
                and latest_record_id <= trained_record_id
            ):
                logger.info("ML training skipped: no new labelled records")
                return

            result = train_risk_model(db)
            logger.info("Automatic ML training completed: %s", result)
        finally:
            db.execute(text("SELECT pg_advisory_unlock(845921)"))
            db.commit()
    except Exception:
        logger.exception("Automatic ML training failed")
    finally:
        db.close()


async def ml_training_scheduler():
    # If a model does not exist, train as soon as enough labelled data exists.
    await run_scheduled_training_once()

    while True:
        await asyncio.sleep(TRAIN_INTERVAL_SECONDS)
        await run_scheduled_training_once()
