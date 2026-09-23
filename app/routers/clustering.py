from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user

from app.services.clustering_service import (
    kmeans_database_clustering,
    dbscan_database_clustering,
    hierarchical_database_clustering
)


router = APIRouter(
    prefix="/clustering",
    tags=["Patient Clustering"]
)


@router.post("/kmeans")
def run_kmeans(
    n_clusters: int = 3,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        clusters = kmeans_database_clustering(
            db=db,
            current_user=current_user,
            n_clusters=n_clusters
        )

        return {
            "status": "success",
            "algorithm": "K-Means",
            "patients_used": len(clusters),
            "clusters": clusters
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"K-Means clustering failed: {str(e)}"
        )


@router.post("/dbscan")
def run_dbscan(
    eps: float = 1.5,
    min_samples: int = 2,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        clusters = dbscan_database_clustering(
            db=db,
            current_user=current_user,
            eps=eps,
            min_samples=min_samples
        )

        return {
            "status": "success",
            "algorithm": "DBSCAN",
            "patients_used": len(clusters),
            "clusters": clusters
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"DBSCAN clustering failed: {str(e)}"
        )


@router.post("/hierarchical")
def run_hierarchical(
    n_clusters: int = 3,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    try:
        clusters = hierarchical_database_clustering(
            db=db,
            current_user=current_user,
            n_clusters=n_clusters
        )

        return {
            "status": "success",
            "algorithm": "Hierarchical",
            "patients_used": len(clusters),
            "clusters": clusters
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hierarchical clustering failed: {str(e)}"
        )