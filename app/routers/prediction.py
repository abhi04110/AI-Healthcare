from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Form
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    Patient,
    HealthRecord
)

from app.routers.auth import get_current_user
from app.routers.patients import get_patient_service

from app.services.ml_service import (
    train_risk_model,
    predict_risk
)


router = APIRouter(
    prefix="/prediction",
    tags=["ML Prediction"]
)


@router.post(
    "/train"
)
def train_model(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admin can train the ML model"
        )

    try:
        result = train_risk_model()

        return {
            "status": "success",
            **result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model training failed: {str(e)}"
        )


@router.post(
    "/risk"
)
def predict_health_risk(
    age: int = Form(...),
    glucose: float = Form(...),
    blood_pressure: float = Form(...),
    bmi: float = Form(...),
    cholesterol: float = Form(...),
    heart_rate: float = Form(...),
    current_user: User = Depends(get_current_user)
):
    try:
        result = predict_risk(
            age=age,
            glucose=glucose,
            blood_pressure=blood_pressure,
            bmi=bmi,
            cholesterol=cholesterol,
            heart_rate=heart_rate
        )

        return {
            "status": "success",
            "message": "Health risk prediction completed",
            "prediction": result,
            "disclaimer": (
                "This prediction is for healthcare analytics "
                "and decision support only. It is not a medical diagnosis."
            )
        }

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post(
    "/patient/{patient_id}"
)
def predict_patient_risk(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = get_patient_service(
        patient_id=patient_id,
        current_user=current_user,
        db=db
    )

    health_record = db.query(
        HealthRecord
    ).filter(
        HealthRecord.patient_id == patient_id
    ).order_by(
        HealthRecord.created_at.desc(),
        HealthRecord.id.desc()
    ).first()

    if not health_record:
        raise HTTPException(
            status_code=404,
            detail="No health record found for this patient"
        )

    required_fields = {
        "age": patient.age,
        "glucose": health_record.glucose,
        "blood_pressure": health_record.blood_pressure,
        "bmi": health_record.bmi,
        "cholesterol": health_record.cholesterol,
        "heart_rate": health_record.heart_rate
    }

    missing_fields = [
        field
        for field, value in required_fields.items()
        if value is None
    ]

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Latest health record does not contain "
                    "all required prediction values"
                ),
                "missing_fields": missing_fields,
                "health_record_id": health_record.id
            }
        )

    try:
        result = predict_risk(
            age=int(patient.age),
            glucose=float(health_record.glucose),
            blood_pressure=float(
                health_record.blood_pressure
            ),
            bmi=float(health_record.bmi),
            cholesterol=float(
                health_record.cholesterol
            ),
            heart_rate=float(
                health_record.heart_rate
            )
        )

        return {
            "status": "success",
            "message": (
                "Health risk prediction generated "
                "from the patient's latest database record"
            ),
            "patient": {
                "id": patient.id,
                "patient_code": patient.patient_code,
                "name": patient.name,
                "age": patient.age
            },
            "health_record": {
                "id": health_record.id,
                "created_at": (
                    health_record.created_at.isoformat()
                    if health_record.created_at
                    else None
                ),
                "glucose": health_record.glucose,
                "blood_pressure": health_record.blood_pressure,
                "bmi": health_record.bmi,
                "cholesterol": health_record.cholesterol,
                "heart_rate": health_record.heart_rate
            },
            "prediction": result,
            "data_source": "PostgreSQL patient health record",
            "disclaimer": (
                "This prediction is for healthcare analytics "
                "and decision support only. It is not a medical diagnosis."
            )
        }

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )