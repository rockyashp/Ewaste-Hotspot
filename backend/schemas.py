from typing import Optional, List
from pydantic import BaseModel
import datetime

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    locality: Optional[str] = "Mumbai"
    role: Optional[str] = "citizen"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    locality: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EWasteItemCreate(BaseModel):
    device_type: str
    brand_model: Optional[str] = None
    quantity: int = 1
    condition: Optional[str] = "Broken Screen / Scrap"
    est_value_inr: Optional[float] = 0.0
    est_gold_g: Optional[float] = 0.0
    est_lead_g: Optional[float] = 0.0
    disposal_intent: Optional[str] = "Drop-Off at Center"

class EWasteItemResponse(BaseModel):
    id: int
    user_id: Optional[int]
    device_type: str
    brand_model: Optional[str]
    quantity: int
    condition: str
    est_value_inr: float
    est_gold_g: float
    est_lead_g: float
    disposal_intent: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class VanTicketCreate(BaseModel):
    society_name: str
    coordinator_name: str
    contact_phone: str
    ward_code: str
    address: str
    pickup_date: str
    total_devices: int
    est_weight_kg: float
    assigned_van: Optional[str] = "Van Fleet #01"
    assigned_recycler: Optional[str] = "EcoRecycle Maharashtra MPCB Hub"

class VanTicketUpdateStatus(BaseModel):
    status: str
    assigned_van: Optional[str] = None
    admin_notes: Optional[str] = None

class VanTicketResponse(BaseModel):
    id: int
    ticket_number: str
    user_id: Optional[int]
    society_name: str
    coordinator_name: str
    contact_phone: str
    ward_code: str
    address: str
    pickup_date: str
    total_devices: int
    est_weight_kg: float
    assigned_van: str
    assigned_recycler: str
    status: str
    admin_notes: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True
