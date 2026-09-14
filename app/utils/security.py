from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """
    Convert normal password into hashed password.
    """

    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify normal password with hashed password.
    """

    return password_hash.verify(
        plain_password,
        hashed_password
    )


# =========================================================
# JWT TOKEN
# =========================================================

def create_access_token(data: dict) -> str:
    """
    Create JWT access token.
    """

    payload = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload.update({
        "exp": expire
    })

    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )

    return token