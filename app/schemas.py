from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator
)


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

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError(
                "Name cannot be empty"
            )

        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value):
        value = value.strip().lower()

        allowed_roles = {
            "admin",
            "doctor",
            "staff"
        }

        if value not in allowed_roles:
            raise ValueError(
                "Role must be admin, doctor, or staff"
            )

        return value


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
    patient_code: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    age: int = Field(
        ...,
        ge=0,
        le=120
    )

    gender: str = Field(
        ...,
        min_length=1,
        max_length=20
    )

    phone: str | None = Field(
        default=None,
        max_length=20
    )

    address: str | None = None

    medical_history: str | None = None


class PatientUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    age: int | None = Field(
        default=None,
        ge=0,
        le=120
    )

    gender: str | None = Field(
        default=None,
        min_length=1,
        max_length=20
    )

    phone: str | None = Field(
        default=None,
        max_length=20
    )

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


class HealthRecordCreate(BaseModel):
    glucose: float | None = Field(
        default=None,
        ge=0
    )

    blood_pressure: float | None = Field(
        default=None,
        ge=0
    )

    bmi: float | None = Field(
        default=None,
        ge=0
    )

    cholesterol: float | None = Field(
        default=None,
        ge=0
    )

    heart_rate: float | None = Field(
        default=None,
        ge=0
    )


class HealthRecordUpdate(BaseModel):
    glucose: float | None = Field(
        default=None,
        ge=0
    )

    blood_pressure: float | None = Field(
        default=None,
        ge=0
    )

    bmi: float | None = Field(
        default=None,
        ge=0
    )

    cholesterol: float | None = Field(
        default=None,
        ge=0
    )

    heart_rate: float | None = Field(
        default=None,
        ge=0
    )


class HealthRecordResponse(BaseModel):
    patient_id: int
    glucose: float | None
    blood_pressure: float | None
    bmi: float | None
    cholesterol: float | None
    heart_rate: float | None
    risk_label: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True


class MedicalReportResponse(BaseModel):
    patient_id: int
    file_name: str
    file_path: str
    file_type: str
    extracted_text: str | None

    class Config:
        from_attributes = True


class RiskPredictionResponse(BaseModel):
    patient_id: int
    risk: str
    confidence: float
    probabilities: dict[str, float]
    created_at: datetime | None

    class Config:
        from_attributes = True