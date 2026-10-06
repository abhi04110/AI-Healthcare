from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Patient
from app.hms_models import CanteenMenuItem, CanteenOrder
from app.routers.auth import get_current_user


router = APIRouter(
    prefix="/hms/canteen",
    tags=["Canteen"]
)


MENU_CREATE_ROLES = {
    "admin",
    "department_admin",
    "canteen_manager"
}

ORDER_CREATE_ROLES = {
    "admin",
    "doctor",
    "nurse",
    "receptionist",
    "patient"
}

ORDER_UPDATE_ROLES = {
    "admin",
    "department_admin",
    "canteen_manager",
    "canteen_worker"
}


@router.post("/menu", status_code=201)
def create_menu_item(
    item_name: str = Form(...),
    category: str | None = Form(None),
    description: str | None = Form(None),
    price: float = Form(...),
    available_quantity: int = Form(0),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in MENU_CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create canteen menu items"
        )

    if price < 0:
        raise HTTPException(
            status_code=400,
            detail="Price cannot be negative"
        )

    if available_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Available quantity cannot be negative"
        )

    item = CanteenMenuItem(
        item_name=item_name,
        category=category,
        description=description,
        price=price,
        available_quantity=available_quantity,
        is_available=available_quantity > 0,
        created_by_user_id=current_user.id
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "message": "Canteen menu item created successfully",
        "item": item
    }


@router.get("/menu")
def get_menu(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(CanteenMenuItem).filter(
        CanteenMenuItem.is_available == True
    ).order_by(
        CanteenMenuItem.item_name.asc()
    ).all()

    return items


@router.get("/menu/all")
def get_all_menu_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_roles = {
        "admin",
        "department_admin",
        "canteen_manager",
        "canteen_worker"
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view all menu items"
        )

    return db.query(CanteenMenuItem).order_by(
        CanteenMenuItem.created_at.desc()
    ).all()


@router.patch("/menu/{item_id}/availability")
def update_menu_availability(
    item_id: int,

    is_available: bool = Form(...),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in MENU_CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update menu availability"
        )

    item = db.query(CanteenMenuItem).filter(
        CanteenMenuItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Canteen menu item not found"
        )

    item.is_available = is_available

    db.commit()
    db.refresh(item)

    return {
        "message": "Menu availability updated successfully",
        "item": item
    }


@router.post("/orders", status_code=201)
def create_canteen_order(
    menu_item_id: int = Form(...),
    quantity: int = Form(...),
    patient_id: int | None = Form(None),
    notes: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ORDER_CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create canteen orders"
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    item = db.query(CanteenMenuItem).filter(
        CanteenMenuItem.id == menu_item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Canteen menu item not found"
        )

    if not item.is_available:
        raise HTTPException(
            status_code=400,
            detail="This food item is currently unavailable"
        )

    if item.available_quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only {item.available_quantity} units "
                f"of this item are available"
            )
        )

    if patient_id is not None:
        patient = db.query(Patient).filter(
            Patient.id == patient_id
        ).first()

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

    total_amount = item.price * quantity

    order = CanteenOrder(
        patient_id=patient_id,
        ordered_by_user_id=current_user.id,
        menu_item_id=menu_item_id,
        quantity=quantity,
        unit_price=item.price,
        total_amount=total_amount,
        status="pending",
        notes=notes
    )

    item.available_quantity -= quantity

    if item.available_quantity == 0:
        item.is_available = False

    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "message": "Canteen order created successfully",
        "order": order
    }


@router.get("/orders")
def get_canteen_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    management_roles = {
        "admin",
        "department_admin",
        "canteen_manager",
        "canteen_worker"
    }

    query = db.query(CanteenOrder)

    if current_user.role in management_roles:
        orders = query.order_by(
            CanteenOrder.created_at.desc()
        ).all()

    else:
        orders = query.filter(
            CanteenOrder.ordered_by_user_id == current_user.id
        ).order_by(
            CanteenOrder.created_at.desc()
        ).all()

    return orders


@router.get("/orders/{order_id}")
def get_canteen_order(
    order_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(CanteenOrder).filter(
        CanteenOrder.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Canteen order not found"
        )

    management_roles = {
        "admin",
        "department_admin",
        "canteen_manager",
        "canteen_worker"
    }

    if current_user.role not in management_roles:
        if order.ordered_by_user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this order"
            )

    return order


@router.patch("/orders/{order_id}/status")
def update_canteen_order_status(
    order_id: int,

    status: str = Form(...),
    notes: str | None = Form(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ORDER_UPDATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update order status"
        )

    allowed_statuses = {
        "pending",
        "preparing",
        "ready",
        "delivered",
        "cancelled"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. Allowed values: "
                "pending, preparing, ready, delivered, cancelled"
            )
        )

    order = db.query(CanteenOrder).filter(
        CanteenOrder.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Canteen order not found"
        )

    if order.status == "delivered":
        raise HTTPException(
            status_code=400,
            detail="Delivered order cannot be changed"
        )

    if order.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Cancelled order cannot be changed"
        )

    if status == "cancelled":
        item = db.query(CanteenMenuItem).filter(
            CanteenMenuItem.id == order.menu_item_id
        ).first()

        if item:
            item.available_quantity += order.quantity
            item.is_available = True

    order.status = status

    if notes is not None:
        order.notes = notes

    db.commit()
    db.refresh(order)

    return {
        "message": "Canteen order status updated successfully",
        "order": order
    }


@router.get("/orders/patient/{patient_id}")
def get_patient_canteen_orders(
    patient_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_roles = {
        "admin",
        "doctor",
        "nurse",
        "receptionist",
        "canteen_manager",
        "canteen_worker"
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view patient orders"
        )

    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    orders = db.query(CanteenOrder).filter(
        CanteenOrder.patient_id == patient_id
    ).order_by(
        CanteenOrder.created_at.desc()
    ).all()

    return orders