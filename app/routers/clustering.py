from fastapi import APIRouter, Depends, HTTPException

from app.models import User
from app.routers.auth import get_current_user

from app.services.clustering_service import (
    kmeans_clustering,
    dbscan_clustering,
    hierarchical_clustering
)


router = APIRouter(
    prefix="/clustering",
    tags=["Patient Clustering"]
)


@router.post("/kmeans")
def run_kmeans(
    records: list[dict],
    n_clusters: int = 3,
    current_user: User = Depends(get_current_user)
):
    if not records:
        raise HTTPException(
            status_code=400,
            detail="Patient data is required"
        )

    try:
        result = kmeans_clustering(
            data=records,
            n_clusters=n_clusters
        )

        return {
            "status": "success",
            "algorithm": "K-Means",
            "clusters": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post("/dbscan")
def run_dbscan(
    records: list[dict],
    eps: float = 1.5,
    min_samples: int = 2,
    current_user: User = Depends(get_current_user)
):
    if not records:
        raise HTTPException(
            status_code=400,
            detail="Patient data is required"
        )

    try:
        result = dbscan_clustering(
            data=records,
            eps=eps,
            min_samples=min_samples
        )

        return {
            "status": "success",
            "algorithm": "DBSCAN",
            "clusters": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post("/hierarchical")
def run_hierarchical(
    records: list[dict],
    n_clusters: int = 3,
    current_user: User = Depends(get_current_user)
):
    if not records:
        raise HTTPException(
            status_code=400,
            detail="Patient data is required"
        )

    try:
        result = hierarchical_clustering(
            data=records,
            n_clusters=n_clusters
        )

        return {
            "status": "success",
            "algorithm": "Hierarchical",
            "clusters": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )