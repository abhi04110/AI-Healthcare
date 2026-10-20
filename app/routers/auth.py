from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import jwt
from jwt.exceptions import InvalidTokenError

import secrets
import string

from app.database import get_db
from app.models import User, Patient
from app.schemas import UserRegister, UserResponse, TokenResponse
from app.services.auth_service import (
    register_user_service,
    login_user_service,
    create_user_by_admin_service,
)
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except (InvalidTokenError, TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_staff(current_user: User = Depends(get_current_user)):
    allowed_roles = {
        "admin",
        "department_admin",
        "doctor",
        "nurse",
        "receptionist",
        "canteen_manager",
        "canteen_worker",
        "housekeeping_supervisor",
        "housekeeping_worker",
        "lab_technician",
        "pharmacist",
        "radiology_technician",
        "staff",
    }
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Staff access required")
    return current_user


@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user_schema = UserRegister(name=name, email=email, password=password, role="patient")
    new_user = register_user_service(user=user_schema, db=db)
    
    # Auto-initialize patient record with a generated patient code
    patient_code = "PT-" + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    patient = Patient(
        patient_code=patient_code,
        name=new_user.name,
        age=0,
        gender="Not specified",
        phone=None,
        address=None,
        medical_history=None,
        user_id=new_user.id,
        created_by=None,
    )
    db.add(patient)
    db.commit()
    
    return new_user


@router.post("/login", response_model=TokenResponse)
def login_user(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    return login_user_service(email=email, password=password, db=db)


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user_by_admin(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = UserRegister(name=name, email=email, password=password, role=role)
    return create_user_by_admin_service(user=user, db=db)


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
