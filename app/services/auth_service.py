from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserRegister
from app.utils.security import hash_password, verify_password, create_access_token

PUBLIC_ROLES = {"patient"}
CORE_ROLES = {
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
    "patient",
    "staff",
}


def create_user_service(user: UserRegister, db: Session, allow_admin: bool = False):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    role = user.role.strip().lower()
    allowed_roles = CORE_ROLES if allow_admin else PUBLIC_ROLES
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only patient accounts can be created through public registration"
                if not allow_admin
                else "Invalid user role"
            ),
        )

    new_user = User(
        name=user.name.strip(),
        email=user.email,
        password=hash_password(user.password),
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def register_user_service(user: UserRegister, db: Session):
    return create_user_service(user=user, db=db, allow_admin=False)


def create_user_by_admin_service(user: UserRegister, db: Session):
    return create_user_service(user=user, db=db, allow_admin=True)


def login_user_service(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {
        "access_token": create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role}
        ),
        "token_type": "bearer",
    }
