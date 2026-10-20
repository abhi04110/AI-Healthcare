from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL


engine = create_engine(DATABASE_URL)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

def ensure_runtime_schema():
    """Apply small backward-compatible runtime migrations for the current deployment."""
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id INTEGER"
        )
        connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_patients_user_id_unique ON patients(user_id) WHERE user_id IS NOT NULL"
        )
        connection.exec_driver_sql(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patients_user_id') THEN ALTER TABLE patients ADD CONSTRAINT fk_patients_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL; END IF; END $$"
        )
