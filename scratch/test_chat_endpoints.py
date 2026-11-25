import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

from datetime import datetime, timezone
from app.chat_models import ChatMessage, ChatReadState
from app.services.chat_service import serialize_chat_message, ConnectionManager
from app.routers.chat import ALLOWED_IMAGE_EXTS, ALLOWED_DOC_EXTS, MAX_FILE_SIZE

# 1. Test message serialization
msg = ChatMessage(
    id=1,
    sender_id=10,
    channel_type="department",
    department_id=2,
    recipient_id=None,
    content="Patient ECG shows sinus tachycardia",
    attachment_url="/uploads/chat/sample_ecg.png",
    attachment_name="sample_ecg.png",
    attachment_type="image",
    attachment_size=1024 * 50,
    is_edited=False,
    is_deleted=False,
    created_at=datetime.now(timezone.utc),
    updated_at=datetime.now(timezone.utc),
)

data = serialize_chat_message(msg, "Dr. Priya Sharma", "doctor")
assert data["id"] == 1
assert data["sender_name"] == "Dr. Priya Sharma"
assert data["channel_type"] == "department"
assert data["attachment_type"] == "image"
print("✓ Serialization test passed")

# 2. Test ConnectionManager
mgr = ConnectionManager()
assert mgr.get_online_users() == []
assert not mgr.is_online(10)
mgr.online_users.add(10)
assert mgr.is_online(10)
assert 10 in mgr.get_online_users()
print("✓ ConnectionManager logic test passed")

# 3. Test attachment constraints
assert ".pdf" in ALLOWED_DOC_EXTS
assert ".png" in ALLOWED_IMAGE_EXTS
assert ".exe" not in (ALLOWED_IMAGE_EXTS | ALLOWED_DOC_EXTS)
assert MAX_FILE_SIZE == 25 * 1024 * 1024
print("✓ File upload security validation test passed")

print("\nAll chat system unit verification tests PASSED successfully!")
