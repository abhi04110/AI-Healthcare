from pydantic import BaseModel, EmailStr, Field


# =========================================================
# USER REGISTER
# =========================================================

class UserRegister(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=6,
        max_length=100
    )

    role: str = Field(
        default="doctor"
    )


# =========================================================
# TOKEN RESPONSE
# =========================================================

class TokenResponse(BaseModel):

    access_token: str

    token_type: str


# =========================================================
# USER RESPONSE
# =========================================================

class UserResponse(BaseModel):

    id: int

    name: str

    email: EmailStr

    role: str

    class Config:

        from_attributes = True