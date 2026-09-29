from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import User
from app.hms_models import Department, StaffProfile
from app.routers.auth import get_current_user
from app.utils.security import hash_password


router = APIRouter(
    prefix="/hms/staff",
    tags=["HMS - Staff Management"]
)


STAFF_ROLES = {
    "department_admin",
    "doctor",
    "nurse",
    "receptionist",
    "canteen_manager",
    "canteen_worker",
    "housekeeping_supervisor",
    "housekeeping_worker",
    "lab_technician",
    "pharmacist",
    "radiology_technician"
}

DEPARTMENT_ADMIN_CREATABLE_ROLES = STAFF_ROLES - {
    "department_admin"
}


def get_department_admin_profile(
    current_user: User,
    db: Session
):
    profile = (
        db.query(StaffProfile)
        .filter(
            StaffProfile.user_id == current_user.id,
            StaffProfile.is_active.is_(True)
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active department admin profile required"
        )

    department = (
        db.query(Department)
        .filter(
            Department.id == profile.department_id,
            Department.is_active.is_(True)
        )
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your department is inactive or unavailable"
        )

    return profile


def require_staff_management_access(
    current_user: User,
    db: Session
):
    if current_user.role == "admin":
        return None

    if current_user.role == "department_admin":
        return get_department_admin_profile(
            current_user=current_user,
            db=db
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Staff management access required"
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED
)
def create_staff(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    department_id: int = Form(...),
    employee_code: str = Form(...),
    designation: str = Form(...),
    qualification: str | None = Form(default=None),
    specialty: str | None = Form(default=None),
    shift_start: str | None = Form(default=None),
    shift_end: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name = name.strip()
    email = email.strip().lower()
    role = role.strip().lower()
    employee_code = employee_code.strip().upper()
    designation = designation.strip()

    qualification = (
        qualification.strip()
        if qualification and qualification.strip()
        else None
    )

    specialty = (
        specialty.strip()
        if specialty and specialty.strip()
        else None
    )

    shift_start = (
        shift_start.strip()
        if shift_start and shift_start.strip()
        else None
    )

    shift_end = (
        shift_end.strip()
        if shift_end and shift_end.strip()
        else None
    )

    if not name or not email or not employee_code or not designation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, email, employee code and designation are required"
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 6 characters"
        )

    if role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid staff role"
        )

    admin_profile = require_staff_management_access(
        current_user=current_user,
        db=db
    )

    if current_user.role == "department_admin":
        if role not in DEPARTMENT_ADMIN_CREATABLE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Department admins cannot create another department admin"
            )

        if department_id != admin_profile.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create staff in your own department"
            )

    department = (
        db.query(Department)
        .filter(
            Department.id == department_id,
            Department.is_active.is_(True)
        )
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active department not found"
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    existing_employee = (
        db.query(StaffProfile)
        .filter(
            StaffProfile.employee_code == employee_code
        )
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee code already exists"
        )

    new_user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role=role
    )

    try:
        db.add(new_user)
        db.flush()

        profile = StaffProfile(
            user_id=new_user.id,
            department_id=department.id,
            employee_code=employee_code,
            designation=designation,
            qualification=qualification,
            specialty=specialty,
            shift_start=shift_start,
            shift_end=shift_end
        )

        db.add(profile)
        db.commit()

        db.refresh(new_user)
        db.refresh(profile)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or employee code already exists"
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create staff account"
        )

    return {
        "message": "Staff account created successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "department_id": department.id,
        "department": department.name,
        "employee_code": profile.employee_code,
        "designation": profile.designation
    }


@router.get("/")
def list_staff(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admin_profile = require_staff_management_access(
        current_user=current_user,
        db=db
    )

    query = (
        db.query(User, StaffProfile, Department)
        .join(
            StaffProfile,
            StaffProfile.user_id == User.id
        )
        .join(
            Department,
            Department.id == StaffProfile.department_id
        )
    )

    if current_user.role == "department_admin":
        query = query.filter(
            StaffProfile.department_id == admin_profile.department_id
        )

    staff = (
        query
        .order_by(Department.name, User.name)
        .all()
    )

    return [
        {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "department_id": department.id,
            "department": department.name,
            "employee_code": profile.employee_code,
            "designation": profile.designation,
            "qualification": profile.qualification,
            "specialty": profile.specialty,
            "shift_start": profile.shift_start,
            "shift_end": profile.shift_end,
            "is_active": profile.is_active
        }
        for user, profile, department in staff
    ]