from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserRegister
from app.utils.security import hash_password, verify_password, create_access_token

PUBLIC_ROLES = {"patient"}
CORE_ROLES = {
    "sub_admin",
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
    if role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin role cannot be created directly. Existing staff can be promoted to Sub-Admin by Super Admin.",
        )

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


def update_user_role_service(user_id: int, new_role: str, current_user: User, db: Session):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can update user roles",
        )

    if hasattr(new_role, "value"):
        new_role = new_role.value

    # Normalize role: handles "sub admin", "sub-admin", "Sub Admin", "subadmin", "sub_admin"
    normalized_role = str(new_role).strip().lower().replace(" ", "_").replace("-", "_")
    if normalized_role == "subadmin":
        normalized_role = "sub_admin"

    if normalized_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot promote to Super Admin. Only Sub-Admin or staff roles can be assigned.",
        )

    if normalized_role not in CORE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{new_role}'. Allowed roles are: {', '.join(sorted(CORE_ROLES))}",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot alter their own root role",
        )

    if target_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin account cannot be modified",
        )

    target_user.role = normalized_role
    db.commit()
    db.refresh(target_user)
    return target_user


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
