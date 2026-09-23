from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user

from app.services.analytics_service import (
    get_basic_analytics,
    get_risk_distribution,
    detect_outliers
)


router = APIRouter(
    prefix="/analytics",
    tags=["Healthcare Analytics"]
)


@router.get("/summary")
def analytics_summary(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        analytics = get_basic_analytics(
            db=db,
            current_user=current_user
        )

        return {
            "status": "success",
            "access_scope": (
                "All patients"
                if current_user.role == "admin"
                else "Patients created by current user"
            ),
            "analytics": analytics
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analytics failed: {str(e)}"
        )


@router.get("/risk-distribution")
def risk_distribution(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        distribution = get_risk_distribution(
            db=db,
            current_user=current_user
        )

        return {
            "status": "success",
            "access_scope": (
                "All patients"
                if current_user.role == "admin"
                else "Patients created by current user"
            ),
            "risk_distribution": distribution
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Risk distribution failed: {str(e)}"
            )
        )


@router.get("/outliers")
def analytics_outliers(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        outliers = detect_outliers(
            db=db,
            current_user=current_user
        )

        return {
            "status": "success",
            "access_scope": (
                "All patients"
                if current_user.role == "admin"
                else "Patients created by current user"
            ),
            "total_outliers": len(outliers),
            "outliers": outliers
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Outlier detection failed: {str(e)}"
            )
        )