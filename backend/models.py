import os
import sys
import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="citizen") # "citizen" or "admin"
    locality = Column(String(100), default="Mumbai")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ewaste_items = relationship("EWasteItem", back_populates="user", cascade="all, delete-orphan")
    van_tickets = relationship("VanTicket", back_populates="user", cascade="all, delete-orphan")

class EWasteItem(Base):
    __tablename__ = "ewaste_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    device_type = Column(String(80), nullable=False)
    brand_model = Column(String(150), nullable=True)
    quantity = Column(Integer, default=1)
    condition = Column(String(50), default="Broken / Dead")
    est_value_inr = Column(Float, default=0.0)
    est_gold_g = Column(Float, default=0.0)
    est_lead_g = Column(Float, default=0.0)
    disposal_intent = Column(String(80), default="Drop-Off at Center")
    status = Column(String(50), default="Registered") # "Registered", "Dropped Off", "Collected", "Recycled"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="ewaste_items")

class VanTicket(Base):
    __tablename__ = "van_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(60), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    society_name = Column(String(150), nullable=False)
    coordinator_name = Column(String(120), nullable=False)
    contact_phone = Column(String(30), nullable=False)
    ward_code = Column(String(20), nullable=False)
    address = Column(String(250), nullable=False)
    pickup_date = Column(String(30), nullable=False)
    total_devices = Column(Integer, default=0)
    est_weight_kg = Column(Float, default=0.0)
    assigned_van = Column(String(100), default="Van Fleet #01")
    assigned_recycler = Column(String(150), default="EcoRecycle Maharashtra MPCB Hub")
    status = Column(String(50), default="Approved & Scheduled") # "Pending Review", "Approved & Scheduled", "Van Dispatched", "Completed", "Cancelled"
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="van_tickets")
