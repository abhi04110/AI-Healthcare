import os
import logging
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone

from fastapi import WebSocket, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.models import User, Patient
from app.hms_models import (
    Department,
    StaffProfile,
    PatientDoctorAssignment,
    Appointment,
    EmergencyCase,
    ICUAdmission,
    OperationTheatreCase
)
from app.chat_models import ChatMessage, ChatReadState

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSockets and user presence across the hospital workspace."""

    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Set of user_ids currently online
        self.online_users: Set[int] = set()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

        was_offline = user_id not in self.online_users
        self.online_users.add(user_id)

        if was_offline:
            await self.broadcast({
                "type": "user_status",
                "user_id": user_id,
                "status": "online"
            })

    async def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.online_users.discard(user_id)
                await self.broadcast({
                    "type": "user_status",
                    "user_id": user_id,
                    "status": "offline"
                })

    def is_online(self, user_id: int) -> bool:
        return user_id in self.online_users

    def get_online_users(self) -> List[int]:
        return list(self.online_users)

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id not in self.active_connections:
            return
        dead_sockets = []
        for socket in self.active_connections[user_id]:
            try:
                await socket.send_json(message)
            except Exception:
                dead_sockets.append(socket)
        for s in dead_sockets:
            if s in self.active_connections[user_id]:
                self.active_connections[user_id].remove(s)

    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        for uid in user_ids:
            await self.send_personal_message(uid, message)

    async def broadcast(self, message: dict):
        all_sockets = [
            (uid, sock)
            for uid, socks in self.active_connections.items()
            for sock in socks
        ]
        for uid, sock in all_sockets:
            try:
                await sock.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


def serialize_chat_message(msg: ChatMessage, sender_name: str, sender_role: str) -> dict:
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "channel_type": msg.channel_type,
        "department_id": msg.department_id,
        "recipient_id": msg.recipient_id,
        "content": msg.content,
        "attachment_url": msg.attachment_url,
        "attachment_name": msg.attachment_name,
        "attachment_type": msg.attachment_type,
        "attachment_size": msg.attachment_size,
        "is_edited": msg.is_edited,
        "is_deleted": msg.is_deleted,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "updated_at": msg.updated_at.isoformat() if msg.updated_at else None,
    }


def get_chat_history(
    db: Session,
    channel_type: str,
    department_id: Optional[int] = None,
    recipient_id: Optional[int] = None,
    current_user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
) -> List[dict]:
    query = db.query(ChatMessage, User.name, User.role).join(
        User, ChatMessage.sender_id == User.id
    )

    if channel_type == "hospital":
        query = query.filter(ChatMessage.channel_type == "hospital")
    elif channel_type == "department":
        if not department_id:
            raise HTTPException(status_code=400, detail="department_id is required")
        query = query.filter(
            ChatMessage.channel_type == "department",
            ChatMessage.department_id == department_id
        )
    elif channel_type == "dm":
        if not recipient_id or not current_user_id:
            raise HTTPException(status_code=400, detail="recipient_id is required for DM")
        query = query.filter(
            ChatMessage.channel_type == "dm",
            or_(
                and_(ChatMessage.sender_id == current_user_id, ChatMessage.recipient_id == recipient_id),
                and_(ChatMessage.sender_id == recipient_id, ChatMessage.recipient_id == current_user_id)
            )
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid channel_type")

    results = query.order_by(ChatMessage.created_at.asc()).offset(offset).limit(limit).all()

    return [
        serialize_chat_message(msg, name, role)
        for msg, name, role in results
    ]


def create_chat_message(
    db: Session,
    sender_id: int,
    channel_type: str,
    content: str,
    department_id: Optional[int] = None,
    recipient_id: Optional[int] = None,
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None,
    attachment_type: Optional[str] = None,
    attachment_size: Optional[int] = None
) -> dict:
    sender = db.query(User).filter(User.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    if channel_type == "department" and not department_id:
        raise HTTPException(status_code=400, detail="department_id required for department channel")
    if channel_type == "dm" and not recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id required for direct message")

    new_msg = ChatMessage(
        sender_id=sender_id,
        channel_type=channel_type,
        department_id=department_id if channel_type == "department" else None,
        recipient_id=recipient_id if channel_type == "dm" else None,
        content=content.strip(),
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        attachment_type=attachment_type,
        attachment_size=attachment_size,
        is_edited=False,
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return serialize_chat_message(new_msg, sender.name, sender.role)


def edit_chat_message(
    db: Session,
    message_id: int,
    user_id: int,
    new_content: str
) -> dict:
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    if msg.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted message")

    msg.content = new_content.strip()
    msg.is_edited = True
    msg.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    sender_name = sender.name if sender else "Staff"
    sender_role = sender.role if sender else "staff"

    return serialize_chat_message(msg, sender_name, sender_role)


def delete_chat_message(
    db: Session,
    message_id: int,
    user_id: int,
    is_admin: bool = False
) -> dict:
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Permission denied to delete this message")

    msg.is_deleted = True
    msg.content = "🚫 This message was deleted"
    msg.attachment_url = None
    msg.attachment_name = None
    msg.attachment_type = None
    msg.attachment_size = None
    msg.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    sender_name = sender.name if sender else "Staff"
    sender_role = sender.role if sender else "staff"

    return serialize_chat_message(msg, sender_name, sender_role)


def mark_chat_read(
    db: Session,
    user_id: int,
    channel_key: str,
    last_message_id: int
) -> dict:
    read_state = db.query(ChatReadState).filter(
        ChatReadState.user_id == user_id,
        ChatReadState.channel_key == channel_key
    ).first()

    now = datetime.now(timezone.utc)
    if read_state:
        if last_message_id > read_state.last_read_message_id:
            read_state.last_read_message_id = last_message_id
            read_state.last_read_at = now
            db.commit()
    else:
        read_state = ChatReadState(
            user_id=user_id,
            channel_key=channel_key,
            last_read_message_id=last_message_id,
            last_read_at=now
        )
        db.add(read_state)
        db.commit()

    return {"status": "ok", "channel_key": channel_key, "last_read_message_id": last_message_id}


def get_staff_workspace_data(db: Session, current_user_id: int) -> dict:
    current_user = db.query(User).filter(User.id == current_user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Read states for current user
    read_states = {
        rs.channel_key: rs.last_read_message_id
        for rs in db.query(ChatReadState).filter(ChatReadState.user_id == current_user_id).all()
    }

    # Case A: Logged-in user is a Patient -> Care Team View Only
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user_id).first()
        care_team_user_ids = set()

        if patient:
            # 1. Assigned doctors
            doc_assigns = db.query(PatientDoctorAssignment.doctor_user_id).filter(
                PatientDoctorAssignment.patient_id == patient.id,
                PatientDoctorAssignment.is_active == True
            ).all()
            for r in doc_assigns:
                care_team_user_ids.add(r[0])

            # 2. Doctors with appointments
            appt_docs = db.query(Appointment.doctor_user_id).filter(
                Appointment.patient_id == patient.id
            ).all()
            for r in appt_docs:
                care_team_user_ids.add(r[0])

            # 3. Emergency & ICU attending nurses
            er_nurses = db.query(EmergencyCase.assigned_nurse_id).filter(
                EmergencyCase.patient_id == patient.id,
                EmergencyCase.assigned_nurse_id.isnot(None)
            ).all()
            for r in er_nurses:
                care_team_user_ids.add(r[0])

            icu_nurses = db.query(ICUAdmission.nurse_user_id).filter(
                ICUAdmission.patient_id == patient.id,
                ICUAdmission.nurse_user_id.isnot(None)
            ).all()
            for r in icu_nurses:
                care_team_user_ids.add(r[0])

        # If no specific care team members yet, include active doctors & nurses
        if not care_team_user_ids:
            default_staff = db.query(User.id).filter(
                User.role.in_(["doctor", "nurse"])
            ).limit(10).all()
            for r in default_staff:
                care_team_user_ids.add(r[0])
        else:
            # Always ensure at least the nursing station is reachable
            general_nurses = db.query(User.id).filter(User.role == "nurse").limit(3).all()
            for r in general_nurses:
                care_team_user_ids.add(r[0])

        care_team_users = db.query(
            User, StaffProfile
        ).outerjoin(
            StaffProfile, User.id == StaffProfile.user_id
        ).filter(
            User.id.in_(care_team_user_ids)
        ).order_by(User.name.asc()).all()

        care_team_list = []
        for u, sp in care_team_users:
            ckey = f"dm_{u.id}"
            last_dm_read = read_states.get(ckey, 0)
            unread = db.query(func.count(ChatMessage.id)).filter(
                ChatMessage.channel_type == "dm",
                ChatMessage.sender_id == u.id,
                ChatMessage.recipient_id == current_user_id,
                ChatMessage.id > last_dm_read,
                ChatMessage.is_deleted == False
            ).scalar() or 0

            last_msg = db.query(ChatMessage).filter(
                ChatMessage.channel_type == "dm",
                or_(
                    and_(ChatMessage.sender_id == current_user_id, ChatMessage.recipient_id == u.id),
                    and_(ChatMessage.sender_id == u.id, ChatMessage.recipient_id == current_user_id)
                )
            ).order_by(ChatMessage.created_at.desc()).first()

            care_team_list.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "department_id": sp.department_id if sp else None,
                "designation": sp.designation if sp else ("Doctor" if u.role == "doctor" else "Staff Nurse"),
                "specialty": sp.specialty if sp else ("Attending Physician" if u.role == "doctor" else "Nursing Care"),
                "employee_code": sp.employee_code if sp else f"MED-{u.id:03d}",
                "is_online": manager.is_online(u.id),
                "unread_count": unread,
                "last_message": last_msg.content if last_msg else None,
                "last_message_time": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            })

        return {
            "hospital_channel": None,
            "departments": [],
            "staff": care_team_list,
            "patients": [],
            "online_user_ids": manager.get_online_users()
        }

    # Case B: Staff Member View (Doctor, Nurse, Admin, etc.)
    # 1. Fetch departments
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()

    # Hospital channel unread count
    last_hospital_read = read_states.get("hospital", 0)
    hospital_unread = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.channel_type == "hospital",
        ChatMessage.id > last_hospital_read,
        ChatMessage.sender_id != current_user_id,
        ChatMessage.is_deleted == False
    ).scalar() or 0

    dept_list = []
    for d in departments:
        ckey = f"dept_{d.id}"
        last_d_read = read_states.get(ckey, 0)
        unread = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.channel_type == "department",
            ChatMessage.department_id == d.id,
            ChatMessage.id > last_d_read,
            ChatMessage.sender_id != current_user_id,
            ChatMessage.is_deleted == False
        ).scalar() or 0

        last_msg = db.query(ChatMessage).filter(
            ChatMessage.channel_type == "department",
            ChatMessage.department_id == d.id
        ).order_by(ChatMessage.created_at.desc()).first()

        dept_list.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "unread_count": unread,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
        })

    # 2. Fetch hospital staff members (excluding patient role and current user)
    staff_users = db.query(
        User, StaffProfile
    ).outerjoin(
        StaffProfile, User.id == StaffProfile.user_id
    ).filter(
        User.role != "patient",
        User.id != current_user_id
    ).order_by(User.name.asc()).all()

    staff_list = []
    for u, sp in staff_users:
        ckey = f"dm_{u.id}"
        last_dm_read = read_states.get(ckey, 0)
        unread = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.channel_type == "dm",
            ChatMessage.sender_id == u.id,
            ChatMessage.recipient_id == current_user_id,
            ChatMessage.id > last_dm_read,
            ChatMessage.is_deleted == False
        ).scalar() or 0

        last_msg = db.query(ChatMessage).filter(
            ChatMessage.channel_type == "dm",
            or_(
                and_(ChatMessage.sender_id == current_user_id, ChatMessage.recipient_id == u.id),
                and_(ChatMessage.sender_id == u.id, ChatMessage.recipient_id == current_user_id)
            )
        ).order_by(ChatMessage.created_at.desc()).first()

        staff_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "department_id": sp.department_id if sp else None,
            "designation": sp.designation if sp else None,
            "specialty": sp.specialty if sp else None,
            "employee_code": sp.employee_code if sp else None,
            "is_online": manager.is_online(u.id),
            "unread_count": unread,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
        })

    # 3. Fetch Assigned / Hospital Patients who have portal login accounts
    patient_list = []
    if current_user.role == "doctor":
        # Only patients assigned to this doctor or with scheduled appointments
        assigned_patient_ids = set()
        for r in db.query(PatientDoctorAssignment.patient_id).filter(
            PatientDoctorAssignment.doctor_user_id == current_user_id,
            PatientDoctorAssignment.is_active == True
        ).all():
            assigned_patient_ids.add(r[0])
        for r in db.query(Appointment.patient_id).filter(
            Appointment.doctor_user_id == current_user_id
        ).all():
            assigned_patient_ids.add(r[0])

        if assigned_patient_ids:
            patient_records = db.query(Patient, User).join(
                User, Patient.user_id == User.id
            ).filter(
                Patient.id.in_(assigned_patient_ids),
                User.role == "patient"
            ).order_by(Patient.name.asc()).all()
        else:
            patient_records = []
    else:
        # Nurses, Admins, Sub-admins, Receptionists see hospital patients with portal accounts
        patient_records = db.query(Patient, User).join(
            User, Patient.user_id == User.id
        ).filter(
            User.role == "patient"
        ).order_by(Patient.name.asc()).all()

    for p, u in patient_records:
        ckey = f"dm_{u.id}"
        last_dm_read = read_states.get(ckey, 0)
        unread = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.channel_type == "dm",
            ChatMessage.sender_id == u.id,
            ChatMessage.recipient_id == current_user_id,
            ChatMessage.id > last_dm_read,
            ChatMessage.is_deleted == False
        ).scalar() or 0

        last_msg = db.query(ChatMessage).filter(
            ChatMessage.channel_type == "dm",
            or_(
                and_(ChatMessage.sender_id == current_user_id, ChatMessage.recipient_id == u.id),
                and_(ChatMessage.sender_id == u.id, ChatMessage.recipient_id == current_user_id)
            )
        ).order_by(ChatMessage.created_at.desc()).first()

        patient_list.append({
            "id": u.id,  # User ID used as recipient_id for direct messaging
            "patient_id": p.id,
            "patient_code": p.patient_code,
            "name": p.name,
            "email": u.email,
            "role": "patient",
            "gender": p.gender,
            "age": p.age,
            "phone": p.phone,
            "is_online": manager.is_online(u.id),
            "unread_count": unread,
            "last_message": last_msg.content if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
        })

    return {
        "hospital_channel": {
            "id": "hospital",
            "name": "All Hospital Staff",
            "code": "ALL-STAFF",
            "unread_count": hospital_unread,
        },
        "departments": dept_list,
        "staff": staff_list,
        "patients": patient_list,
        "online_user_ids": manager.get_online_users()
    }


def get_staff_profile_detail(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == user_id).first()
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": "patient",
            "is_online": manager.is_online(user.id),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "patient_profile": {
                "patient_id": patient.id if patient else None,
                "patient_code": patient.patient_code if patient else f"PAT-{user.id:04d}",
                "age": patient.age if patient else None,
                "gender": patient.gender if patient else None,
                "phone": patient.phone if patient else None,
                "address": patient.address if patient else None,
                "medical_history": patient.medical_history if patient else "No recorded chronic conditions"
            }
        }

    sp = db.query(StaffProfile).filter(StaffProfile.user_id == user_id).first()
    dept = db.query(Department).filter(Department.id == sp.department_id).first() if sp else None

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_online": manager.is_online(user.id),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "staff_profile": {
            "employee_code": sp.employee_code if sp else f"EMP-{user.id:03d}",
            "designation": sp.designation if sp else user.role.replace("_", " ").title(),
            "qualification": sp.qualification if sp else "Clinical / Hospital Operations Certified",
            "specialty": sp.specialty if sp else "General Hospital Operations",
            "shift_start": sp.shift_start if sp else "09:00",
            "shift_end": sp.shift_end if sp else "17:00",
            "is_active": sp.is_active if sp else True,
            "department_id": dept.id if dept else None,
            "department_name": dept.name if dept else "General Hospital",
            "department_code": dept.code if dept else "GEN",
        }
    }
