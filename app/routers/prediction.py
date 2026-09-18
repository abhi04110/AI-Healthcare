from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Form
)

from app.models import User
from app.routers.auth import get_current_user

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