from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    PatientCreate,
    PatientUpdate,
    PatientResponse
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
    patient: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_patient_service(
        patient_data=patient,
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
    patient: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return update_patient_service(
        patient_id=patient_id,
        patient_data=patient,
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