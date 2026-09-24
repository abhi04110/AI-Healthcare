from fastapi import (
    HTTPException,
    status
)

from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserRegister

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token
)


PUBLIC_ROLES = {
    "doctor",
    "staff"
}

ALL_ROLES = {
    "admin",
    "doctor",
    "staff"
}


def create_user_service(
    user: UserRegister,
    db: Session,
    allow_admin: bool = False
):
    existing_user = (
        db.query(User)
        .filter(
            User.email == user.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    role = user.role.strip().lower()

    allowed_roles = (
        ALL_ROLES
        if allow_admin
        else PUBLIC_ROLES
    )

    if role not in allowed_roles:
        if allow_admin:
            detail = (
                "Role must be admin, doctor, or staff"
            )
        else:
            detail = (
                "Public registration only allows "
                "doctor or staff role"
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

    hashed_password = hash_password(
        user.password
    )

    new_user = User(
        name=user.name.strip(),
        email=user.email,
        password=hashed_password,
        role=role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def register_user_service(
    user: UserRegister,
    db: Session
):
    return create_user_service(
        user=user,
        db=db,
        allow_admin=False
    )


def create_user_by_admin_service(
    user: UserRegister,
    db: Session
):
    return create_user_service(
        user=user,
        db=db,
        allow_admin=True
    )


def login_user_service(
    email: str,
    password: str,
    db: Session
):
    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    password_valid = verify_password(
        password,
        user.password
    )

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }