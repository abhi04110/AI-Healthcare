from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Form,
    status
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models import (
    User,
    Patient,
    HealthRecord
)

from app.schemas import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    HealthRecordCreate,
    HealthRecordUpdate,
    HealthRecordResponse
)

from app.routers.auth import get_current_user

from app.services.patient_service import (
    create_patient_service,
    get_patients_service,
    get_patient_service,
    update_patient_service,
    delete_patient_service
)


router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED
)
def create_patient(
    patient_code: str = Form(...),
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    phone: str | None = Form(None),
    address: str | None = Form(None),
    medical_history: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient_data = PatientCreate(
        patient_code=patient_code,
        name=name,
        age=age,
        gender=gender,
        phone=phone,
        address=address,
        medical_history=medical_history
    )

    return create_patient_service(
        patient_data=patient_data,
        current_user=current_user,
        db=db
    )


@router.get(
    "",
    response_model=list[PatientResponse]
)
def get_patients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return get_patients_service(
        current_user=current_user,
        db=db
    )


@router.get(
    "/{patient_id}",
    response_model=PatientResponse
)
def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )


@router.put(
    "/{patient_id}",
    response_model=PatientResponse
)
def update_patient(
    patient_id: int,
    name: str | None = Form(None),
    age: int | None = Form(None),
    gender: str | None = Form(None),
    phone: str | None = Form(None),
    address: str | None = Form(None),
    medical_history: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient_data = PatientUpdate(
        name=name,
        age=age,
        gender=gender,
        phone=phone,
        address=address,
        medical_history=medical_history
    )

    return update_patient_service(
        patient_id=patient_id,
        patient_data=patient_data,
        current_user=current_user,
        db=db
    )


@router.delete(
    "/{patient_id}"
)
def delete_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return delete_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )


@router.post(
    "/{patient_id}/health-records",
    response_model=HealthRecordResponse,
    status_code=status.HTTP_201_CREATED
)
def create_health_record(
    patient_id: int,
    glucose: float | None = Form(None),
    blood_pressure: float | None = Form(None),
    bmi: float | None = Form(None),
    cholesterol: float | None = Form(None),
    heart_rate: float | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    health_record_data = HealthRecordCreate(
        glucose=glucose,
        blood_pressure=blood_pressure,
        bmi=bmi,
        cholesterol=cholesterol,
        heart_rate=heart_rate
    )

    record = HealthRecord(
        patient_id=patient.id,
        glucose=health_record_data.glucose,
        blood_pressure=health_record_data.blood_pressure,
        bmi=health_record_data.bmi,
        cholesterol=health_record_data.cholesterol,
        heart_rate=health_record_data.heart_rate
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get(
    "/{patient_id}/health-records",
    response_model=list[HealthRecordResponse]
)
def get_health_records(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    return db.query(HealthRecord).filter(
        HealthRecord.patient_id == patient.id
    ).all()


@router.get(
    "/{patient_id}/health-records/{record_id}",
    response_model=HealthRecordResponse
)
def get_health_record(
    patient_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.patient_id == patient.id
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )

    return record


@router.put(
    "/{patient_id}/health-records/{record_id}",
    response_model=HealthRecordResponse
)
def update_health_record(
    patient_id: int,
    record_id: int,
    glucose: float | None = Form(None),
    blood_pressure: float | None = Form(None),
    bmi: float | None = Form(None),
    cholesterol: float | None = Form(None),
    heart_rate: float | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.patient_id == patient.id
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )

    health_record_data = HealthRecordUpdate(
        glucose=glucose,
        blood_pressure=blood_pressure,
        bmi=bmi,
        cholesterol=cholesterol,
        heart_rate=heart_rate
    )

    update_data = health_record_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    return record


@router.delete(
    "/{patient_id}/health-records/{record_id}"
)
def delete_health_record(
    patient_id: int,
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    record = db.query(HealthRecord).filter(
        HealthRecord.id == record_id,
        HealthRecord.patient_id == patient.id
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )

    db.delete(record)
    db.commit()

    return {
        "message": "Health record deleted successfully"
    }