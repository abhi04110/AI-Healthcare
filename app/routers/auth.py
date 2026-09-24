from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Form,
    status
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from sqlalchemy.orm import Session

import jwt
from jwt.exceptions import InvalidTokenError

from app.database import get_db
from app.models import User

from app.schemas import (
    UserRegister,
    UserResponse,
    TokenResponse
)

from app.services.auth_service import (
    register_user_service,
    login_user_service,
    create_user_by_admin_service
)

from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


security = HTTPBearer()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: Literal["doctor", "staff"] = Form(
        default="doctor"
    ),
    db: Session = Depends(get_db)
):
    user = UserRegister(
        name=name,
        email=email,
        password=password,
        role=role
    )

    return register_user_service(
        user=user,
        db=db
    )


@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    return login_user_service(
        email=email,
        password=password,
        db=db
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except InvalidTokenError:
        raise credentials_exception

    try:
        user_id = int(user_id)
    except (
        TypeError,
        ValueError
    ):
        raise credentials_exception

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


def require_admin(
    current_user: User = Depends(
        get_current_user
    )
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def require_staff(
    current_user: User = Depends(
        get_current_user
    )
):
    allowed_roles = {
        "admin",
        "doctor",
        "staff"
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )

    return current_user


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user_by_admin(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: Literal[
        "admin",
        "doctor",
        "staff"
    ] = Form(
        default="doctor"
    ),
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(get_db)
):
    user = UserRegister(
        name=name,
        email=email,
        password=password,
        role=role
    )

    return create_user_by_admin_service(
        user=user,
        db=db
    )


@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(
        get_current_user
    )
):
    return current_user