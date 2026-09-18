from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from app.models import User

from app.routers.auth import get_current_user

from app.services.analytics_service import (
    get_basic_analytics,
    detect_outliers
)


router = APIRouter(
    prefix="/analytics",
    tags=["Healthcare Analytics"]
)


@router.get(
    "/summary"
)
def analytics_summary(
    current_user: User = Depends(
        get_current_user
    ),
    db=Depends(
        __import__(
            "app.database",
            fromlist=["get_db"]
        ).get_db
    )
):

    try:

        return {
            "status": "success",
            "analytics": get_basic_analytics(
                db
            )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Analytics failed: {str(e)}"
        )


@router.get(
    "/outliers"
)
def analytics_outliers(
    current_user: User = Depends(
        get_current_user
    ),
    db=Depends(
        __import__(
            "app.database",
            fromlist=["get_db"]
        ).get_db
    )
):

    try:

        outliers = detect_outliers(
            db
        )

        return {
            "status": "success",
            "total_outliers": len(
                outliers
            ),
            "outliers": outliers
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Outlier detection failed: {str(e)}"
        )