from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models import User

from app.schemas import UserRegister

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token
)


# =========================================================
# REGISTER USER
# =========================================================

def register_user_service(
    user: UserRegister,
    db: Session
):

    # Check email already exists
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()


    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )


    # Valid roles
    valid_roles = [
        "admin",
        "doctor",
        "staff"
    ]


    if user.role.lower() not in valid_roles:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be admin, doctor, or staff"
        )


    # Hash password
    hashed_password = hash_password(
        user.password
    )


    # Create user
    new_user = User(

        name=user.name,

        email=user.email,

        password=hashed_password,

        role=user.role.lower()
    )


    # Save user
    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    return new_user


# =========================================================
# LOGIN USER
# =========================================================

def login_user_service(
    email: str,
    password: str,
    db: Session
):

    # Find user
    user = db.query(User).filter(
        User.email == email
    ).first()


    # User not found
    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


    # Verify password
    password_valid = verify_password(
        password,
        user.password
    )


    if not password_valid:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


    # Create JWT Token
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