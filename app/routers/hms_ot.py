from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import OperationTheatreCase
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/ot",
    tags=["Operation Theatre"]
)


ALLOWED_CREATE_ROLES = {
    "admin",
    "department_admin",
    "doctor"
}

ALLOWED_UPDATE_ROLES = {
    "admin",
    "doctor",
    "nurse"
}


@router.post("/", response_model=dict, status_code=201)
def create_ot_case(
    patient_id: int = Form(...),
    surgeon_user_id: int | None = Form(None),
    assistant_doctor_id: int | None = Form(None),
    nurse_user_id: int | None = Form(None),

    operation_name: str = Form(...),
    operation_type: str | None = Form(None),

    theatre_number: str = Form(...),
    scheduled_at: datetime = Form(...),

    diagnosis: str | None = Form(None),
    pre_op_notes: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ALLOWED_CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create OT cases"
        )

    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    if surgeon_user_id:
        surgeon = db.query(User).filter(
            User.id == surgeon_user_id,
            User.role == "doctor"
        ).first()

        if not surgeon:
            raise HTTPException(
                status_code=400,
                detail="Invalid surgeon doctor"
            )

    if assistant_doctor_id:
        assistant = db.query(User).filter(
            User.id == assistant_doctor_id,
            User.role == "doctor"
        ).first()

        if not assistant:
            raise HTTPException(
                status_code=400,
                detail="Invalid assistant doctor"
            )

    if nurse_user_id:
        nurse = db.query(User).filter(
            User.id == nurse_user_id,
            User.role == "nurse"
        ).first()

        if not nurse:
            raise HTTPException(
                status_code=400,
                detail="Invalid nurse"
            )

    existing_theatre = db.query(OperationTheatreCase).filter(
        OperationTheatreCase.theatre_number == theatre_number,
        OperationTheatreCase.scheduled_at == scheduled_at,
        OperationTheatreCase.status.in_(
            ["scheduled", "in_progress"]
        )
    ).first()

    if existing_theatre:
        raise HTTPException(
            status_code=409,
            detail="This operation theatre is already booked at this time"
        )

    case = OperationTheatreCase(
        patient_id=patient_id,
        surgeon_user_id=surgeon_user_id,
        assistant_doctor_id=assistant_doctor_id,
        nurse_user_id=nurse_user_id,
        operation_name=operation_name,
        operation_type=operation_type,
        theatre_number=theatre_number,
        scheduled_at=scheduled_at,
        diagnosis=diagnosis,
        pre_op_notes=pre_op_notes,
        status="scheduled",
        created_by_user_id=current_user.id
    )

    db.add(case)
    db.commit()
    db.refresh(case)

    return {
        "message": "OT case created successfully",
        "case": case
    }


@router.get("/", response_model=list[dict])
def get_ot_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(OperationTheatreCase)

    if current_user.role == "admin":
        cases = query.order_by(
            OperationTheatreCase.scheduled_at.asc()
        ).all()

    elif current_user.role == "doctor":
        cases = query.filter(
            OperationTheatreCase.surgeon_user_id == current_user.id
        ).order_by(
            OperationTheatreCase.scheduled_at.asc()
        ).all()

    elif current_user.role == "nurse":
        cases = query.filter(
            OperationTheatreCase.nurse_user_id == current_user.id
        ).order_by(
            OperationTheatreCase.scheduled_at.asc()
        ).all()

    else:
        cases = query.filter(
            OperationTheatreCase.created_by_user_id == current_user.id
        ).order_by(
            OperationTheatreCase.scheduled_at.asc()
        ).all()

    return cases


@router.get("/{case_id}", response_model=dict)
def get_ot_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(OperationTheatreCase).filter(
        OperationTheatreCase.id == case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="OT case not found"
        )

    if current_user.role == "admin":
        return case

    if current_user.role == "doctor":
        if case.surgeon_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned as surgeon for this OT case"
            )

    elif current_user.role == "nurse":
        if case.nurse_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this OT case"
            )

    else:
        if case.created_by_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this OT case"
            )

    return case


@router.patch("/{case_id}/status", response_model=dict)
def update_ot_status(
    case_id: int,

    status: str = Form(...),
    post_op_notes: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ALLOWED_UPDATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update OT status"
        )

    allowed_statuses = {
        "scheduled",
        "in_progress",
        "completed",
        "cancelled"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                "scheduled, in_progress, completed, cancelled"
            )
        )

    case = db.query(OperationTheatreCase).filter(
        OperationTheatreCase.id == case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="OT case not found"
        )

    if current_user.role == "doctor":
        if case.surgeon_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not the assigned surgeon"
            )

    elif current_user.role == "nurse":
        if case.nurse_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this OT case"
            )

    case.status = status

    if post_op_notes is not None:
        case.post_op_notes = post_op_notes

    db.commit()
    db.refresh(case)

    return {
        "message": "OT status updated successfully",
        "case": case
    }