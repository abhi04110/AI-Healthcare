
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError(f"DATABASE_URL missing. Check your .env file at: {ENV_FILE}")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

ML_RETRAIN_INTERVAL_HOURS = int(os.getenv("ML_RETRAIN_INTERVAL_HOURS", "24"))

MEDICAL_KNOWLEDGE_DIR = Path(
    os.getenv("MEDICAL_KNOWLEDGE_DIR", str(BASE_DIR / "medical_knowledge"))
)
VECTOR_STORE_DIR = Path(
    os.getenv("VECTOR_STORE_DIR", str(BASE_DIR / "vector_store"))
)

RAG_EMBEDDING_MODEL = os.getenv(
    "RAG_EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "4"))
RAG_MAX_CONTEXT_CHARS = int(os.getenv("RAG_MAX_CONTEXT_CHARS", "12000"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RAG_QUEUE_NAME = os.getenv("RAG_QUEUE_NAME", "medical-rag")
RAG_SYNC_INTERVAL_HOURS = int(os.getenv("RAG_SYNC_INTERVAL_HOURS", "24"))
RAG_JOB_TIMEOUT_SECONDS = int(os.getenv("RAG_JOB_TIMEOUT_SECONDS", "1800"))

RAG_UPLOAD_MAX_MB = int(os.getenv("RAG_UPLOAD_MAX_MB", "25"))