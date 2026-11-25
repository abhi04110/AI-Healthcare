from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient, HealthRecord, MedicalReport, RiskPrediction
from app.hms_models import (
    Appointment,
    Consultation,
    Prescription,
    LabOrder,
    Bill,
    Medicine,
    EmergencyCase,
    ICUAdmission,
    OperationTheatreCase,
    HousekeepingTask,
    CanteenMenuItem,
    CanteenOrder,
)
from app.routers.auth import get_current_user
from app.services.access_service import get_accessible_patient_ids

router = APIRouter(prefix="/hms/dashboard", tags=["HMS Dashboard"])


def _count(db: Session, model, column=None, values=None):
    query = db.query(model)
    if column is not None and values is not None:
        if not values:
            return 0
        query = query.filter(column.in_(values))
    return query.count()


def _status_count(db: Session, model, status_value: str, column=None, values=None):
    query = db.query(model).filter(
        func.lower(func.trim(model.status)) == status_value.lower().strip()
    )
    if column is not None and values is not None:
        if not values:
            return 0
        query = query.filter(column.in_(values))
    return query.count()


@router.get("/")
def get_hms_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient_ids = get_accessible_patient_ids(db, current_user)

    total_menu_items = _count(db, CanteenMenuItem)
    available_menu_items = db.query(CanteenMenuItem).filter(CanteenMenuItem.is_available == True).count()

    if current_user.role in {"admin", "sub_admin"}:
        dashboard = {
            "total_users": _count(db, User),
            "total_patients": _count(db, Patient),
            "total_health_records": _count(db, HealthRecord),
            "total_medical_reports": _count(db, MedicalReport),
            "total_risk_predictions": _count(db, RiskPrediction),
            "total_appointments": _count(db, Appointment),
            "total_consultations": _count(db, Consultation),
            "total_prescriptions": _count(db, Prescription),
            "total_lab_orders": _count(db, LabOrder),
            "total_bills": _count(db, Bill),
            "total_medicines": _count(db, Medicine),
            "total_emergency_cases": _count(db, EmergencyCase),
            "total_icu_admissions": _count(db, ICUAdmission),
            "total_ot_cases": _count(db, OperationTheatreCase),
            "total_housekeeping_tasks": _count(db, HousekeepingTask),
            "total_canteen_menu_items": total_menu_items,
            "available_canteen_menu_items": available_menu_items,
            "total_canteen_orders": _count(db, CanteenOrder),
        }
        scope = "all hospital data"
    else:
        dashboard = {
            "total_users": 1,
            "total_patients": len(patient_ids),
            "total_health_records": _count(db, HealthRecord, HealthRecord.patient_id, patient_ids),
            "total_medical_reports": _count(db, MedicalReport, MedicalReport.patient_id, patient_ids),
            "total_risk_predictions": _count(db, RiskPrediction, RiskPrediction.patient_id, patient_ids),
            "total_appointments": _count(db, Appointment, Appointment.patient_id, patient_ids),
            "total_consultations": _count(db, Consultation, Consultation.patient_id, patient_ids),
            "total_prescriptions": _count(db, Prescription, Prescription.patient_id, patient_ids),
            "total_lab_orders": _count(db, LabOrder, LabOrder.patient_id, patient_ids),
            "total_bills": _count(db, Bill, Bill.patient_id, patient_ids),
            "total_medicines": 0,
            "total_emergency_cases": _count(db, EmergencyCase, EmergencyCase.patient_id, patient_ids),
            "total_icu_admissions": _count(db, ICUAdmission, ICUAdmission.patient_id, patient_ids),
            "total_ot_cases": _count(db, OperationTheatreCase, OperationTheatreCase.patient_id, patient_ids),
            "total_housekeeping_tasks": 0,
            "total_canteen_menu_items": total_menu_items,
            "available_canteen_menu_items": available_menu_items,
            "total_canteen_orders": _count(db, CanteenOrder, CanteenOrder.patient_id, patient_ids),
        }
        scope = "only patients accessible to the current user"

    def scoped_status(model, value):
        if current_user.role in {"admin", "sub_admin"}:
            return _status_count(db, model, value)
        return _status_count(db, model, value, model.patient_id, patient_ids)

    # Canteen order status breakdown
    pending_canteen = scoped_status(CanteenOrder, "pending")
    preparing_canteen = scoped_status(CanteenOrder, "preparing")
    ready_canteen = scoped_status(CanteenOrder, "ready")
    delivered_canteen = scoped_status(CanteenOrder, "delivered")
    cancelled_canteen = scoped_status(CanteenOrder, "cancelled")
    total_canteen_orders = (
        dashboard["total_canteen_orders"]
        if "total_canteen_orders" in dashboard
        else (pending_canteen + preparing_canteen + ready_canteen + delivered_canteen + cancelled_canteen)
    )

    emergency_stats = {
        key: scoped_status(EmergencyCase, key)
        for key in ["waiting", "in_treatment", "admitted", "discharged", "cancelled"]
    }
    emergency_stats.update({
        "total_cases": dashboard["total_emergency_cases"],
        "critical": scoped_status(EmergencyCase, "critical") or 0,
    })

    icu_stats = {
        key: scoped_status(ICUAdmission, key)
        for key in ["admitted", "critical", "stable", "discharged"]
    }
    icu_stats.update({
        "total_admissions": dashboard["total_icu_admissions"],
        "active_occupied": (
            icu_stats.get("admitted", 0) +
            icu_stats.get("critical", 0) +
            icu_stats.get("stable", 0)
        ),
    })

    ot_stats = {
        key: scoped_status(OperationTheatreCase, key)
        for key in ["scheduled", "in_progress", "completed", "cancelled"]
    }
    ot_stats.update({
        "total_cases": dashboard["total_ot_cases"],
    })

    housekeeping_stats = (
        {
            key: _status_count(db, HousekeepingTask, key)
            for key in ["pending", "assigned", "in_progress", "completed", "cancelled"]
        }
        if current_user.role in {"admin", "sub_admin"}
        else {}
    )
    if housekeeping_stats:
        housekeeping_stats["total_tasks"] = dashboard.get("total_housekeeping_tasks", 0)

    return {
        "access_scope": scope,
        "dashboard": dashboard,
        "emergency": emergency_stats,
        "icu": icu_stats,
        "operation_theatre": ot_stats,
        "housekeeping": housekeeping_stats,
        "canteen": {
            "pending": pending_canteen,
            "preparing": preparing_canteen,
            "ready": ready_canteen,
            "delivered": delivered_canteen,
            "cancelled": cancelled_canteen,
            "pending_orders": pending_canteen,
            "preparing_orders": preparing_canteen,
            "ready_orders": ready_canteen,
            "delivered_orders": delivered_canteen,
            "cancelled_orders": cancelled_canteen,
            "total_orders": total_canteen_orders,
            "total_menu_items": total_menu_items,
            "available_menu_items": available_menu_items,
        },
    }
