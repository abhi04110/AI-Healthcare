import os
import uuid
import logging
from typing import Optional, Literal
from pydantic import BaseModel, Field

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status
)
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError

from app.database import get_db, SessionLocal
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM
from app.models import User, Patient
from app.hms_models import PatientDoctorAssignment, Appointment
from app.routers.auth import get_current_user
from app.services.chat_service import (
    manager,
    get_staff_workspace_data,
    get_chat_history,
    create_chat_message,
    edit_chat_message,
    delete_chat_message,
    mark_chat_read,
    get_staff_profile_detail
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Hospital Staff Chat"])

UPLOAD_CHAT_DIR = os.path.join("uploads", "chat")
os.makedirs(UPLOAD_CHAT_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_DOC_EXTS = {".pdf", ".doc", ".docx", ".txt", ".csv", ".xlsx"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def validate_chat_dm_permission(current_user: User, recipient_id: int, db: Session) -> User:
    """Validates that a direct message conversation is clinically permitted between the two parties."""
    recipient = db.query(User).filter(User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    if current_user.id == recipient_id:
        return recipient

    # Case 1: Current user is a Patient
    if current_user.role == "patient":
        if recipient.role == "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient-to-patient messaging is not permitted for clinical privacy."
            )
        if recipient.role not in ("doctor", "nurse", "admin", "sub_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patients can only message their clinical care team (Doctor or Nurse)."
            )

        # If recipient is a doctor, verify assignment or appointment
        if recipient.role == "doctor":
            patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
            if not patient:
                raise HTTPException(status_code=403, detail="Patient clinical record not found.")

            is_assigned = (
                db.query(PatientDoctorAssignment).filter(
                    PatientDoctorAssignment.patient_id == patient.id,
                    PatientDoctorAssignment.doctor_user_id == recipient.id,
                    PatientDoctorAssignment.is_active == True
                ).first()
                or db.query(Appointment).filter(
                    Appointment.patient_id == patient.id,
                    Appointment.doctor_user_id == recipient.id
                ).first()
            )
            # If no strict assignment exists yet, allow initial consult contact to avoid patient isolation
            # but log if needed

        return recipient

    # Case 2: Recipient is a Patient (Current user is Staff)
    if recipient.role == "patient":
        if current_user.role == "doctor":
            patient = db.query(Patient).filter(Patient.user_id == recipient.id).first()
            if not patient:
                raise HTTPException(status_code=404, detail="Patient clinical record not found.")

            is_assigned = (
                db.query(PatientDoctorAssignment).filter(
                    PatientDoctorAssignment.patient_id == patient.id,
                    PatientDoctorAssignment.doctor_user_id == current_user.id,
                    PatientDoctorAssignment.is_active == True
                ).first()
                or db.query(Appointment).filter(
                    Appointment.patient_id == patient.id,
                    Appointment.doctor_user_id == current_user.id
                ).first()
            )
            if not is_assigned:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Doctors can only initiate messages with their assigned patients."
                )
        elif current_user.role not in ("nurse", "admin", "sub_admin", "receptionist"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only medical doctors, attending nurses, and clinic administrators can message patients."
            )

    return recipient


# Schemas
class SendMessageRequest(BaseModel):
    channel_type: Literal["hospital", "department", "dm"]
    content: str = Field(..., min_length=1)
    department_id: Optional[int] = None
    recipient_id: Optional[int] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_size: Optional[int] = None


class EditMessageRequest(BaseModel):
    content: str = Field(..., min_length=1)


class MarkReadRequest(BaseModel):
    channel_key: str
    last_message_id: int


# WebSocket Endpoint
@router.websocket("/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db: Session = SessionLocal()
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except (InvalidTokenError, ValueError, TypeError) as exc:
        logger.warning(f"WebSocket auth failed: {exc}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    finally:
        db.close()

    await manager.connect(user.id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif event_type == "typing":
                # Broadcast typing notification to peers
                channel_key = data.get("channel_key")
                recipient_id = data.get("recipient_id")
                typing_payload = {
                    "type": "typing",
                    "user_id": user.id,
                    "user_name": user.name,
                    "channel_key": channel_key
                }
                if recipient_id:
                    await manager.send_personal_message(int(recipient_id), typing_payload)
                else:
                    await manager.broadcast(typing_payload)

    except WebSocketDisconnect:
        await manager.disconnect(user.id, websocket)
    except Exception as exc:
        logger.error(f"WebSocket error for user {user.id}: {exc}")
        await manager.disconnect(user.id, websocket)


# REST Endpoints
@router.get("/workspace")
def get_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns accessible hospital channels, departments, active staff members, and patients."""
    return get_staff_workspace_data(db, current_user.id)


@router.get("/messages")
def list_messages(
    channel_type: Literal["hospital", "department", "dm"] = Query(...),
    department_id: Optional[int] = Query(None),
    recipient_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve message history for a channel, department, or DM."""
    if current_user.role == "patient":
        if channel_type in ("hospital", "department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient accounts can only access direct messages with their medical care team."
            )
        if channel_type == "dm":
            if not recipient_id:
                raise HTTPException(status_code=400, detail="recipient_id is required for direct messages.")
            validate_chat_dm_permission(current_user, recipient_id, db)
    elif channel_type == "dm" and recipient_id:
        validate_chat_dm_permission(current_user, recipient_id, db)

    return get_chat_history(
        db=db,
        channel_type=channel_type,
        department_id=department_id,
        recipient_id=recipient_id,
        current_user_id=current_user.id,
        limit=limit,
        offset=offset
    )


@router.post("/messages")
async def send_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a new text or attachment message and broadcast in real-time."""
    if current_user.role == "patient":
        if payload.channel_type in ("hospital", "department"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient accounts can only message their medical care team."
            )
        if payload.channel_type == "dm":
            if not payload.recipient_id:
                raise HTTPException(status_code=400, detail="recipient_id is required for direct messages.")
            validate_chat_dm_permission(current_user, payload.recipient_id, db)
    elif payload.channel_type == "dm" and payload.recipient_id:
        validate_chat_dm_permission(current_user, payload.recipient_id, db)

    msg = create_chat_message(
        db=db,
        sender_id=current_user.id,
        channel_type=payload.channel_type,
        content=payload.content,
        department_id=payload.department_id,
        recipient_id=payload.recipient_id,
        attachment_url=payload.attachment_url,
        attachment_name=payload.attachment_name,
        attachment_type=payload.attachment_type,
        attachment_size=payload.attachment_size,
    )

    # Real-time WebSocket dispatch
    event = {
        "type": "new_message",
        "message": msg
    }

    if payload.channel_type in ("hospital", "department"):
        await manager.broadcast(event)
    elif payload.channel_type == "dm" and payload.recipient_id:
        await manager.send_personal_message(payload.recipient_id, event)
        await manager.send_personal_message(current_user.id, event)

    return msg


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload an image or document attachment for chat."""
    filename = file.filename or "attachment"
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    if ext in ALLOWED_IMAGE_EXTS:
        attachment_type = "image"
    elif ext in ALLOWED_DOC_EXTS:
        attachment_type = "document"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTS | ALLOWED_DOC_EXTS))}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 25 MB limit")

    safe_name = f"{uuid.uuid4().hex}_{os.path.basename(filename)}"
    destination = os.path.join(UPLOAD_CHAT_DIR, safe_name)

    with open(destination, "wb") as f:
        f.write(content)

    url_path = f"/uploads/chat/{safe_name}"

    return {
        "attachment_url": url_path,
        "attachment_name": filename,
        "attachment_type": attachment_type,
        "attachment_size": len(content)
    }


@router.put("/messages/{message_id}")
async def edit_message(
    message_id: int,
    payload: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit an existing message and broadcast the update to all connected peers."""
    updated = edit_chat_message(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        new_content=payload.content
    )

    event = {
        "type": "message_edited",
        "message": updated
    }
    await manager.broadcast(event)
    return updated


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete a message and broadcast the deletion event."""
    is_admin = current_user.role in ("admin", "sub_admin")
    deleted = delete_chat_message(
        db=db,
        message_id=message_id,
        user_id=current_user.id,
        is_admin=is_admin
    )

    event = {
        "type": "message_deleted",
        "message": deleted
    }
    await manager.broadcast(event)
    return deleted


@router.post("/read")
def mark_read(
    payload: MarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a channel or direct message thread as read."""
    return mark_chat_read(
        db=db,
        user_id=current_user.id,
        channel_key=payload.channel_key,
        last_message_id=payload.last_message_id
    )


@router.get("/staff/{user_id}/profile")
def get_staff_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full profile details for a staff member or patient."""
    return get_staff_profile_detail(db=db, user_id=user_id)
