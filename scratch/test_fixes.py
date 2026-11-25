import sys
sys.path.insert(0, '.')

from app.chat_models import ChatReadState
from datetime import datetime, timezone

# 1. Test ChatReadState constructor
rs = ChatReadState(
    user_id=1,
    channel_key="dm_4",
    last_read_message_id=50,
    last_read_at=datetime.now(timezone.utc)
)
assert rs.user_id == 1
assert rs.channel_key == "dm_4"
assert rs.last_read_message_id == 50
print("ChatReadState constructor test passed!")

# 2. Test hms_canteen imports and roles
from app.routers.hms_canteen import (
    MENU_CREATE_ROLES,
    ORDER_CREATE_ROLES,
    ORDER_UPDATE_ROLES
)
assert "patient" in ORDER_CREATE_ROLES
assert "sub_admin" in MENU_CREATE_ROLES
assert "sub_admin" in ORDER_UPDATE_ROLES
print("hms_canteen roles test passed!")
