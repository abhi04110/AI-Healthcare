from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator
)


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="doctor")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Name cannot be empty")

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


class HealthRecordCreate(BaseModel):
    glucose: float | None = Field(default=None, ge=0)
    blood_pressure: float | None = Field(default=None, ge=0)
    bmi: float | None = Field(default=None, ge=0)
    cholesterol: float | None = Field(default=None, ge=0)
    heart_rate: float | None = Field(default=None, ge=0)


class HealthRecordUpdate(BaseModel):
    glucose: float | None = Field(default=None, ge=0)
    blood_pressure: float | None = Field(default=None, ge=0)
    bmi: float | None = Field(default=None, ge=0)
    cholesterol: float | None = Field(default=None, ge=0)
    heart_rate: float | None = Field(default=None, ge=0)


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


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_user_id: int
    appointment_date: datetime
    reason: str | None = None
    notes: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_user_id: int
    created_by_user_id: int | None
    appointment_date: datetime
    reason: str | None
    status: str
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    appointment_id: int
    symptoms: str | None = None
    diagnosis: str | None = None
    treatment_plan: str | None = None
    follow_up_date: datetime | None = None
    notes: str | None = None


class ConsultationResponse(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    doctor_user_id: int
    symptoms: str | None
    diagnosis: str | None
    treatment_plan: str | None
    follow_up_date: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrescriptionCreate(BaseModel):
    consultation_id: int
    medicine_name: str = Field(..., min_length=2, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    duration: str = Field(..., min_length=1, max_length=100)
    instructions: str | None = None


class PrescriptionResponse(BaseModel):
    id: int
    consultation_id: int
    patient_id: int
    doctor_user_id: int
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class LabOrderCreate(BaseModel):
    patient_id: int
    test_name: str = Field(..., min_length=2, max_length=200)
    test_type: str | None = Field(default=None, max_length=100)
    priority: str = Field(default="normal", max_length=30)
    clinical_notes: str | None = None


class LabOrderStatusUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=30)


class LabOrderResponse(BaseModel):
    id: int
    patient_id: int
    doctor_user_id: int
    test_name: str
    test_type: str | None
    priority: str
    clinical_notes: str | None
    status: str
    ordered_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LabResultCreate(BaseModel):
    lab_order_id: int
    result_value: str = Field(..., min_length=1)
    unit: str | None = Field(default=None, max_length=50)
    reference_range: str | None = Field(default=None, max_length=100)
    interpretation: str | None = None
    result_status: str = Field(default="normal", max_length=30)
    remarks: str | None = None


class LabResultResponse(BaseModel):
    id: int
    lab_order_id: int
    patient_id: int
    technician_user_id: int
    result_value: str
    unit: str | None
    reference_range: str | None
    interpretation: str | None
    result_status: str
    remarks: str | None
    completed_at: datetime

    class Config:
        from_attributes = True


class MedicineCreate(BaseModel):
    medicine_name: str = Field(..., min_length=2, max_length=200)
    generic_name: str | None = Field(default=None, max_length=200)
    manufacturer: str | None = Field(default=None, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    batch_number: str = Field(..., min_length=2, max_length=100)
    quantity: int = Field(..., ge=0)
    unit_price: float = Field(..., ge=0)
    expiry_date: datetime


class MedicineResponse(BaseModel):
    id: int
    medicine_name: str
    generic_name: str | None
    manufacturer: str | None
    category: str | None
    batch_number: str
    quantity: int
    unit_price: float
    expiry_date: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicineDispenseCreate(BaseModel):
    medicine_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    prescription_id: int | None = Field(default=None, gt=0)
    patient_id: int | None = Field(default=None, gt=0)
    notes: str | None = None


class MedicineDispenseResponse(BaseModel):
    id: int
    medicine_id: int
    quantity: int
    total_price: float
    notes: str | None
    prescription_id: int | None
    patient_id: int | None
    pharmacist_user_id: int
    unit_price: float
    dispensed_at: datetime

    class Config:
        from_attributes = True


class BillCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    bill_number: str = Field(..., min_length=2, max_length=100)
    discount: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)
    notes: str | None = None


class BillItemCreate(BaseModel):
    bill_id: int = Field(..., gt=0)
    item_type: str = Field(..., min_length=2, max_length=50)
    description: str = Field(..., min_length=2, max_length=300)
    quantity: int = Field(default=1, gt=0)
    unit_price: float = Field(..., ge=0)


class BillPaymentUpdate(BaseModel):
    paid_amount: float = Field(..., ge=0)


class BillResponse(BaseModel):
    id: int
    patient_id: int
    created_by_user_id: int | None
    bill_number: str
    subtotal: float
    discount: float
    tax: float
    total_amount: float
    paid_amount: float
    payment_status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BillItemResponse(BaseModel):
    id: int
    bill_id: int
    item_type: str
    description: str
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True
        
class MedicineStockUpdate(BaseModel):
    quantity: int = Field(..., ge=0)
    
class EmergencyCaseCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    assigned_doctor_id: int | None = Field(default=None, gt=0)
    assigned_nurse_id: int | None = Field(default=None, gt=0)
    priority: str = Field(default="normal", max_length=30)
    symptoms: str | None = None
    vitals: str | None = None
    treatment_notes: str | None = None
    admission_required: bool = False


class EmergencyStatusUpdate(BaseModel):
    status: str = Field(..., max_length=30)
    treatment_notes: str | None = None
    admission_required: bool | None = None


class EmergencyCaseResponse(BaseModel):
    id: int
    patient_id: int
    assigned_doctor_id: int | None
    assigned_nurse_id: int | None
    priority: str
    symptoms: str | None
    vitals: str | None
    treatment_notes: str | None
    status: str
    admission_required: bool
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
class ICUAdmissionCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    doctor_user_id: int | None = Field(default=None, gt=0)
    nurse_user_id: int | None = Field(default=None, gt=0)
    bed_number: str = Field(..., min_length=1, max_length=50)
    room_number: str | None = Field(default=None, max_length=50)
    admission_reason: str = Field(..., min_length=2)
    vitals: str | None = None
    treatment_notes: str | None = None


class ICUStatusUpdate(BaseModel):
    status: str = Field(..., max_length=30)
    vitals: str | None = None
    treatment_notes: str | None = None


class ICUAdmissionResponse(BaseModel):
    id: int
    patient_id: int
    doctor_user_id: int | None
    nurse_user_id: int | None
    bed_number: str
    room_number: str | None
    admission_reason: str
    vitals: str | None
    treatment_notes: str | None
    status: str
    admitted_at: datetime
    discharged_at: datetime | None
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
class OTCaseCreate(BaseModel):
    patient_id: int = Field(..., gt=0)
    surgeon_user_id: int | None = Field(default=None, gt=0)
    assistant_doctor_id: int | None = Field(default=None, gt=0)
    nurse_user_id: int | None = Field(default=None, gt=0)

    operation_name: str = Field(..., min_length=2, max_length=200)
    operation_type: str | None = Field(default=None, max_length=100)

    theatre_number: str = Field(..., min_length=1, max_length=50)

    scheduled_at: datetime

    diagnosis: str | None = None
    pre_op_notes: str | None = None


class OTStatusUpdate(BaseModel):
    status: str = Field(..., max_length=30)
    post_op_notes: str | None = None


class OTCaseResponse(BaseModel):
    id: int

    patient_id: int

    surgeon_user_id: int | None
    assistant_doctor_id: int | None
    nurse_user_id: int | None

    operation_name: str
    operation_type: str | None

    theatre_number: str
    scheduled_at: datetime

    diagnosis: str | None
    pre_op_notes: str | None
    post_op_notes: str | None

    status: str

    created_by_user_id: int

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True