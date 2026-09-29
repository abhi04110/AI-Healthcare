from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User
from app.hms_models import Department
from app.routers.auth import require_admin


router = APIRouter(
    prefix="/hms/departments",
    tags=["HMS - Departments"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_department(
    name: str = Form(...),
    code: str = Form(...),
    description: str | None = Form(default=None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    name = name.strip()
    code = code.strip().upper()

    if not name or not code:
        raise HTTPException(
            status_code=400,
            detail="Department name and code are required"
        )

    existing = db.query(Department).filter(
        (func.lower(Department.name) == name.lower())
        | (func.upper(Department.code) == code)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Department name or code already exists"
        )

    department = Department(
        name=name,
        code=code,
        description=description.strip() if description else None,
        created_by_user_id=current_user.id
    )

    db.add(department)

    try:
        db.commit()
        db.refresh(department)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create department"
        )

    return {
        "id": department.id,
        "name": department.name,
        "code": department.code,
        "description": department.description,
        "is_active": department.is_active,
        "created_at": department.created_at
    }


@router.get("/")
def list_departments(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    departments = (
        db.query(Department)
        .order_by(Department.name.asc())
        .all()
    )

    return [
        {
            "id": department.id,
            "name": department.name,
            "code": department.code,
            "description": department.description,
            "is_active": department.is_active,
            "created_at": department.created_at
        }
        for department in departments
    ]