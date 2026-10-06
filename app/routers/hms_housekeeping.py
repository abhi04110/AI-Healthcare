from datetime import datetime

from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.hms_models import HousekeepingTask
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/housekeeping",
    tags=["Housekeeping"]
)


CREATE_ROLES = {
    "admin",
    "department_admin",
    "housekeeping_supervisor"
}

UPDATE_ROLES = {
    "admin",
    "department_admin",
    "housekeeping_supervisor",
    "housekeeping_worker"
}


@router.post("/", status_code=201)
def create_housekeeping_task(
    task_type: str = Form(...),
    area: str = Form(...),
    room_number: str | None = Form(None),
    priority: str = Form("normal"),
    assigned_worker_id: int | None = Form(None),
    description: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create housekeeping tasks"
        )

    allowed_priorities = {
        "low",
        "normal",
        "high",
        "urgent"
    }

    if priority not in allowed_priorities:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid priority. Allowed values: "
                "low, normal, high, urgent"
            )
        )

    if assigned_worker_id is not None:
        worker = db.query(User).filter(
            User.id == assigned_worker_id,
            User.role == "housekeeping_worker"
        ).first()

        if not worker:
            raise HTTPException(
                status_code=400,
                detail="Invalid housekeeping worker"
            )

    task = HousekeepingTask(
        task_type=task_type,
        area=area,
        room_number=room_number,
        priority=priority,
        assigned_worker_id=assigned_worker_id,
        description=description,
        status="pending",
        created_by_user_id=current_user.id
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "message": "Housekeeping task created successfully",
        "task": task
    }


@router.get("/")
def get_housekeeping_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(HousekeepingTask)

    if current_user.role == "admin":
        tasks = query.order_by(
            HousekeepingTask.created_at.desc()
        ).all()

    elif current_user.role in {
        "department_admin",
        "housekeeping_supervisor"
    }:
        tasks = query.order_by(
            HousekeepingTask.created_at.desc()
        ).all()

    elif current_user.role == "housekeeping_worker":
        tasks = query.filter(
            HousekeepingTask.assigned_worker_id == current_user.id
        ).order_by(
            HousekeepingTask.created_at.desc()
        ).all()

    else:
        tasks = query.filter(
            HousekeepingTask.created_by_user_id == current_user.id
        ).order_by(
            HousekeepingTask.created_at.desc()
        ).all()

    return tasks


@router.get("/{task_id}")
def get_housekeeping_task(
    task_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(HousekeepingTask).filter(
        HousekeepingTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Housekeeping task not found"
        )

    if current_user.role == "admin":
        return task

    if current_user.role in {
        "department_admin",
        "housekeeping_supervisor"
    }:
        return task

    if current_user.role == "housekeeping_worker":
        if task.assigned_worker_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this housekeeping task"
            )

        return task

    if task.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this housekeeping task"
        )

    return task


@router.patch("/{task_id}/status")
def update_housekeeping_status(
    task_id: int,

    status: str = Form(...),
    description: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in UPDATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update housekeeping tasks"
        )

    allowed_statuses = {
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                "pending, assigned, in_progress, "
                "completed, cancelled"
            )
        )

    task = db.query(HousekeepingTask).filter(
        HousekeepingTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Housekeeping task not found"
        )

    if current_user.role == "housekeeping_worker":
        if task.assigned_worker_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this housekeeping task"
            )

    if status == "in_progress":
        if task.started_at is None:
            task.started_at = datetime.utcnow()

    if status == "completed":
        if task.started_at is None:
            task.started_at = datetime.utcnow()

        task.completed_at = datetime.utcnow()

    if status in {"pending", "assigned"}:
        if task.status == "completed":
            raise HTTPException(
                status_code=400,
                detail="Completed task cannot be moved back to pending/assigned"
            )

    task.status = status

    if description is not None:
        task.description = description

    db.commit()
    db.refresh(task)

    return {
        "message": "Housekeeping task status updated successfully",
        "task": task
    }


@router.patch("/{task_id}/assign")
def assign_housekeeping_worker(
    task_id: int,

    assigned_worker_id: int = Form(...),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to assign workers"
        )

    task = db.query(HousekeepingTask).filter(
        HousekeepingTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Housekeeping task not found"
        )

    worker = db.query(User).filter(
        User.id == assigned_worker_id,
        User.role == "housekeeping_worker"
    ).first()

    if not worker:
        raise HTTPException(
            status_code=400,
            detail="Invalid housekeeping worker"
        )

    task.assigned_worker_id = assigned_worker_id

    if task.status == "pending":
        task.status = "assigned"

    db.commit()
    db.refresh(task)

    return {
        "message": "Housekeeping worker assigned successfully",
        "task": task
    }