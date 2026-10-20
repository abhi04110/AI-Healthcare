from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import ML_RETRAIN_INTERVAL_HOURS
from app.models import User, Patient, HealthRecord, RiskPrediction
from app.routers.auth import get_current_user
from app.routers.patients import get_patient_service
from app.services.ml_service import predict_risk, get_model_status, get_training_data_summary, train_risk_model

router = APIRouter(prefix="/prediction", tags=["ML Prediction"])


def require_clinical_ml_access(current_user: User):
    if current_user.role not in {"admin", "doctor"}:
        raise HTTPException(
            status_code=403,
            detail="Only admin or doctor can run clinical risk prediction",
        )
    return current_user


@router.post("/train", include_in_schema=False)
def train_model_internal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Kept only as an internal emergency/admin maintenance endpoint.
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        return {"status": "success", **train_risk_model(db)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Model training failed: {exc}")


@router.get("/training-data", include_in_schema=False)
def get_training_data_internal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"status": "success", "training_data": get_training_data_summary(db)}


@router.get("/model-status")
def model_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return {
        "status": "success",
        "model": get_model_status(),
        "training_data": get_training_data_summary(db),
        "schedule": {
            "automatic": True,
            "interval_hours": ML_RETRAIN_INTERVAL_HOURS,
            "behavior": "Retrains only when new labelled records are available and the dataset is ready",
        },
    }


@router.post("/risk")
def predict_health_risk(
    age: int = Form(...),
    glucose: float = Form(...),
    blood_pressure: float = Form(...),
    bmi: float = Form(...),
    cholesterol: float = Form(...),
    heart_rate: float = Form(...),
    current_user: User = Depends(get_current_user),
):
    require_clinical_ml_access(current_user)

    if age < 0 or age > 120:
        raise HTTPException(status_code=400, detail="Age must be between 0 and 120")
    values = {
        "glucose": glucose,
        "blood_pressure": blood_pressure,
        "bmi": bmi,
        "cholesterol": cholesterol,
        "heart_rate": heart_rate,
    }
    for field, value in values.items():
        if value < 0:
            raise HTTPException(status_code=400, detail=f"{field} cannot be negative")

    try:
        result = predict_risk(
            age=age,
            glucose=glucose,
            blood_pressure=blood_pressure,
            bmi=bmi,
            cholesterol=cholesterol,
            heart_rate=heart_rate,
        )
        return {
            "status": "success",
            "message": "Health risk prediction completed",
            "prediction": result,
            "data_source": "Manual clinical input",
            "disclaimer": "This prediction is healthcare decision support only and is not a medical diagnosis.",
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@router.post("/patient/{patient_id}")
def predict_patient_health_risk(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_clinical_ml_access(current_user)
    patient = get_patient_service(patient_id, current_user, db)

    health_record = (
        db.query(HealthRecord)
        .filter(HealthRecord.patient_id == patient.id)
        .order_by(HealthRecord.created_at.desc(), HealthRecord.id.desc())
        .first()
    )
    if not health_record:
        raise HTTPException(status_code=404, detail="No health record found for this patient")

    required = {
        "glucose": health_record.glucose,
        "blood_pressure": health_record.blood_pressure,
        "bmi": health_record.bmi,
        "cholesterol": health_record.cholesterol,
        "heart_rate": health_record.heart_rate,
    }
    missing = [name for name, value in required.items() if value is None]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={"message": "Latest health record is incomplete for ML prediction", "missing_fields": missing},
        )

    try:
        result = predict_risk(
            age=patient.age,
            glucose=health_record.glucose,
            blood_pressure=health_record.blood_pressure,
            bmi=health_record.bmi,
            cholesterol=health_record.cholesterol,
            heart_rate=health_record.heart_rate,
        )
        prediction = RiskPrediction(
            patient_id=patient.id,
            health_record_id=health_record.id,
            risk=result["risk"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
        )
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        return {
            "status": "success",
            "message": "Health risk prediction generated and saved successfully",
            "patient": {
                "id": patient.id,
                "patient_code": patient.patient_code,
                "name": patient.name,
                "age": patient.age,
            },
            "health_record": {
                "patient_id": patient.id,
                "created_at": health_record.created_at.isoformat() if health_record.created_at else None,
                **required,
            },
            "prediction": result,
            "data_source": "PostgreSQL patient health record",
            "disclaimer": "This prediction is healthcare decision support only and is not a medical diagnosis.",
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@router.get("/patient/{patient_id}/history")
def get_patient_prediction_history(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient = get_patient_service(patient_id, current_user, db)
    predictions = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient.id)
        .order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc())
        .all()
    )
    return {
        "status": "success",
        "patient_id": patient.id,
        "patient_name": patient.name,
        "predictions": [
            {
                "patient_id": patient.id,
                "risk": item.risk,
                "confidence": item.confidence,
                "probabilities": item.probabilities,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in predictions
        ],
    }


@router.get("/history")
def get_prediction_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(RiskPrediction)
    if current_user.role != "admin":
        # Reuse the central patient access policy.
        from app.services.access_service import get_accessible_patient_ids
        patient_ids = get_accessible_patient_ids(db, current_user)
        if not patient_ids:
            return {"status": "success", "predictions": []}
        query = query.filter(RiskPrediction.patient_id.in_(patient_ids))

    predictions = query.order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc()).all()
    return {
        "status": "success",
        "predictions": [
            {
                "patient_id": item.patient_id,
                "risk": item.risk,
                "confidence": item.confidence,
                "probabilities": item.probabilities,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in predictions
        ],
    }
