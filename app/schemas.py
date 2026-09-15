from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="doctor")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class PatientCreate(BaseModel):
    patient_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    age: int = Field(..., ge=0, le=120)
    gender: str = Field(..., min_length=1, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None
    medical_history: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, min_length=1, max_length=20)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None
    medical_history: str | None = None


class PatientResponse(BaseModel):
    id: int
    patient_code: str
    name: str
    age: int
    gender: str
    phone: str | None
    address: str | None
    medical_history: str | None
    created_by: int | None

    class Config:
        from_attributes = True