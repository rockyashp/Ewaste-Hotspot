"""
FastAPI Backend Service for Mumbai Citizen E-Waste Portal & Municipal Operations
Serves geospatial data, citizen e-waste logs, society pickup tickets, and administrative management.
"""

import os
import sys

# Ensure backend directory is in sys.path regardless of where uvicorn is launched
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import json
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from database import engine, Base, get_db, SessionLocal
import models
import schemas
import auth

# Initialize PostgreSQL database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mumbai E-Waste Portal API",
    description="Municipal Environmental Platform for Greater Mumbai (BMC)",
    version="2.1.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

# Cache datasets in memory
GEOJSON_PATH = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.geojson")
CSV_PATH = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.csv")
FAC_PATH = os.path.join(PROCESSED_DIR, "mpcb_authorized_facilities.csv")
POI_PATH = os.path.join(PROCESSED_DIR, "mumbai_electronics_pois.geojson")

with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
    WARDS_GEOJSON = json.load(f)

WARDS_DF = pd.read_csv(CSV_PATH)
FACILITIES_DF = pd.read_csv(FAC_PATH)

POIS_GEOJSON = None
if os.path.exists(POI_PATH):
    try:
        with open(POI_PATH, "r", encoding="utf-8") as f:
            POIS_GEOJSON = json.load(f)
    except Exception:
        POIS_GEOJSON = None

# Seed initial admin & demo users if missing
def seed_initial_records():
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.email == "admin@bmc.gov.in").first()
        if not admin:
            admin = models.User(
                name="BMC Municipal Officer",
                email="admin@bmc.gov.in",
                phone="022-22620251",
                password_hash=auth.get_password_hash("admin123"),
                role="admin",
                locality="Fort / BMC HQ"
            )
            db.add(admin)
            db.commit()

        citizen = db.query(models.User).filter(models.User.email == "citizen@mumbai.in").first()
        if not citizen:
            citizen = models.User(
                name="Aarav Mehta",
                email="citizen@mumbai.in",
                phone="9820011223",
                password_hash=auth.get_password_hash("citizen123"),
                role="citizen",
                locality="Andheri West"
            )
            db.add(citizen)
            db.commit()
    finally:
        db.close()

seed_initial_records()

# --------------------------------------------------------------------------
# ROOT & SUMMARY ENDPOINTS
# --------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "portal": "Mumbai E-Waste Public Portal",
        "region": "Brihanmumbai Municipal Corporation (BMC)",
        "status": "online"
    }

@app.get("/api/summary")
def get_citywide_summary():
    """Returns top-level municipal KPI metrics."""
    total_pop = int(WARDS_DF['pop_2024_projected'].sum())
    total_ewaste = float(WARDS_DF['ewaste_gen_annual_mt_baseline'].sum())
    avg_per_capita = round((total_ewaste * 1000) / total_pop, 2)
    high_hotspots = int((WARDS_DF['hotspot_category'] == 'HIGH').sum())
    med_hotspots = int((WARDS_DF['hotspot_category'] == 'MEDIUM').sum())
    low_hotspots = int((WARDS_DF['hotspot_category'] == 'LOW').sum())
    critical_gaps = int((WARDS_DF['collection_gap_status'] == 'CRITICAL GAP').sum())
    moderate_gaps = int((WARDS_DF['collection_gap_status'] == 'MODERATE GAP').sum())
    total_facilities = len(FACILITIES_DF)
    mmr_facilities = int(FACILITIES_DF['serves_mmr'].sum())
    total_weekly_trips = int(WARDS_DF['weekly_collection_trips_needed'].sum())

    return {
        "projected_population_2024": total_pop,
        "total_annual_ewaste_mt": total_ewaste,
        "avg_per_capita_kg_year": avg_per_capita,
        "hotspots_count": {
            "high": high_hotspots,
            "medium": med_hotspots,
            "low": low_hotspots
        },
        "gaps_count": {
            "critical": critical_gaps,
            "moderate": moderate_gaps,
            "well_served": len(WARDS_DF) - (critical_gaps + moderate_gaps)
        },
        "mpcb_facilities": {
            "total_state": total_facilities,
            "accessible_mmr": mmr_facilities
        },
        "total_weekly_van_trips": total_weekly_trips,
        "total_weekly_capacity_mt": round(total_weekly_trips * 2.5, 1)
    }

@app.get("/api/wards")
def get_wards_geojson():
    return JSONResponse(content=WARDS_GEOJSON)

@app.get("/api/wards/{ward_id:path}")
def get_ward_detail(ward_id: str):
    clean_id = ward_id.strip().upper()
    sub = WARDS_DF[WARDS_DF['name'] == clean_id]
    if sub.empty:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found among 24 BMC Wards")
    clean_records = json.loads(sub.iloc[0:1].to_json(orient="records"))
    return clean_records[0]

@app.get("/api/facilities")
def get_facilities(mmr_only: bool = True):
    df = FACILITIES_DF[FACILITIES_DF['serves_mmr'] == True] if mmr_only else FACILITIES_DF
    clean_records = json.loads(df.to_json(orient="records"))
    return clean_records

@app.get("/api/pois")
def get_pois():
    if POIS_GEOJSON is None:
        raise HTTPException(status_code=404, detail="POI GeoJSON not found")
    return JSONResponse(content=POIS_GEOJSON)

@app.get("/api/export")
def export_planning_matrix_csv():
    csv_str = WARDS_DF.to_csv(index=False)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mumbai_ewaste_collection_plan.csv"}
    )

# --------------------------------------------------------------------------
# AUTHENTICATION (CITIZEN & ADMIN)
# --------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=schemas.AuthTokenResponse)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = models.User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=auth.get_password_hash(payload.password),
        role="citizen", # Citizens register here
        locality=payload.locality or "Mumbai"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = auth.create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return schemas.AuthTokenResponse(access_token=token, user=new_user)

@app.post("/api/auth/login", response_model=schemas.AuthTokenResponse)
def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower().strip()).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = auth.create_access_token({"sub": str(user.id), "role": user.role})
    return schemas.AuthTokenResponse(access_token=token, user=user)

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_current_user_profile(user: models.User = Depends(auth.get_current_user)):
    return user

# --------------------------------------------------------------------------
# CITIZEN E-WASTE INVENTORY & LOGGING
# --------------------------------------------------------------------------

@app.post("/api/ewaste/log", response_model=schemas.EWasteItemResponse)
def log_ewaste_item(
    payload: schemas.EWasteItemCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    item = models.EWasteItem(
        user_id=current_user.id if current_user else None,
        device_type=payload.device_type,
        brand_model=payload.brand_model,
        quantity=payload.quantity,
        condition=payload.condition,
        est_value_inr=payload.est_value_inr or 0.0,
        est_gold_g=payload.est_gold_g or 0.0,
        est_lead_g=payload.est_lead_g or 0.0,
        disposal_intent=payload.disposal_intent,
        status="Registered"
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/api/ewaste/my-items", response_model=List[schemas.EWasteItemResponse])
def get_my_logged_ewaste(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.EWasteItem).filter(models.EWasteItem.user_id == user.id).order_by(models.EWasteItem.created_at.desc()).all()
    return items

# --------------------------------------------------------------------------
# SOCIETY VAN COLLECTION TICKETS
# --------------------------------------------------------------------------

@app.post("/api/tickets/create", response_model=schemas.VanTicketResponse)
def create_van_ticket(
    payload: schemas.VanTicketCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    ticket_num = f"BMC-TRUCK-{payload.ward_code.replace('/', '')}-{int(pd.Timestamp.now().timestamp() % 100000)}"

    ticket = models.VanTicket(
        ticket_number=ticket_num,
        user_id=current_user.id if current_user else None,
        society_name=payload.society_name.strip(),
        coordinator_name=payload.coordinator_name.strip(),
        contact_phone=payload.contact_phone.strip(),
        ward_code=payload.ward_code,
        address=payload.address.strip(),
        pickup_date=payload.pickup_date,
        total_devices=payload.total_devices,
        est_weight_kg=payload.est_weight_kg,
        assigned_van=payload.assigned_van or "Van Fleet #01",
        assigned_recycler=payload.assigned_recycler or "EcoRecycle Maharashtra MPCB Hub",
        status="Approved & Scheduled"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

@app.get("/api/tickets/my-tickets", response_model=List[schemas.VanTicketResponse])
def get_my_van_tickets(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    tickets = db.query(models.VanTicket).filter(models.VanTicket.user_id == user.id).order_by(models.VanTicket.created_at.desc()).all()
    return tickets

# --------------------------------------------------------------------------
# MUNICIPAL ADMIN PORTAL ENDPOINTS
# --------------------------------------------------------------------------

@app.get("/api/admin/overview")
def get_admin_overview(
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(models.User).count()
    total_citizens = db.query(models.User).filter(models.User.role == "citizen").count()
    total_tickets = db.query(models.VanTicket).count()
    total_devices_scheduled = db.query(models.VanTicket).with_entities(models.VanTicket.total_devices).all()
    total_devices = sum([t[0] for t in total_devices_scheduled if t[0]])
    total_weight = db.query(models.VanTicket).with_entities(models.VanTicket.est_weight_kg).all()
    total_weight_kg = sum([w[0] for w in total_weight if w[0]])

    pending_tickets = db.query(models.VanTicket).filter(models.VanTicket.status == "Pending Review").count()
    scheduled_tickets = db.query(models.VanTicket).filter(models.VanTicket.status.in_(["Approved & Scheduled", "Van Dispatched"])).count()
    completed_tickets = db.query(models.VanTicket).filter(models.VanTicket.status == "Completed").count()

    total_logged_items = db.query(models.EWasteItem).count()

    return {
        "total_users": total_users,
        "total_citizens": total_citizens,
        "total_tickets": total_tickets,
        "pending_tickets": pending_tickets,
        "scheduled_tickets": scheduled_tickets,
        "completed_tickets": completed_tickets,
        "total_devices_pledged": total_devices,
        "total_weight_kg": round(total_weight_kg, 1),
        "total_logged_items": total_logged_items
    }

@app.get("/api/admin/tickets", response_model=List[schemas.VanTicketResponse])
def list_all_tickets(
    ward: Optional[str] = None,
    status_filter: Optional[str] = None,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.VanTicket)
    if ward:
        query = query.filter(models.VanTicket.ward_code == ward)
    if status_filter:
        query = query.filter(models.VanTicket.status == status_filter)
    return query.order_by(models.VanTicket.created_at.desc()).all()

@app.patch("/api/admin/tickets/{ticket_id}/status", response_model=schemas.VanTicketResponse)
def update_ticket_status(
    ticket_id: int,
    payload: schemas.VanTicketUpdateStatus,
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(models.VanTicket).filter(models.VanTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Van ticket not found.")

    ticket.status = payload.status
    if payload.assigned_van:
        ticket.assigned_van = payload.assigned_van
    if payload.admin_notes:
        ticket.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(ticket)
    return ticket

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def list_all_users(
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@app.get("/api/admin/ewaste", response_model=List[schemas.EWasteItemResponse])
def list_all_ewaste_items(
    admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    return db.query(models.EWasteItem).order_by(models.EWasteItem.created_at.desc()).all()
