from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm
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
    login_user_service
)

from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# OAUTH2
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user: UserRegister,
    db: Session = Depends(get_db)
):

    return register_user_service(
        user=user,
        db=db
    )


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    return login_user_service(
        email=form_data.username,
        password=form_data.password,
        db=db
    )


# =========================================================
# GET CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )


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


    # Find user in database
    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()


    if user is None:

        raise credentials_exception


    return user


# =========================================================
# CURRENT USER PROFILE
# =========================================================

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