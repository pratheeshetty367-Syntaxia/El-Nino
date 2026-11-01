"""Pydantic request / response schemas."""
from datetime import datetime
from typing import Literal
 
from pydantic import BaseModel, ConfigDict, EmailStr, Field
 
 
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=72)
 
 
class UserLogin(BaseModel):
    email: EmailStr
    password: str
 
 
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
 
 
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
 
 
class UserAdminUpdate(BaseModel):
    role: Literal["user", "researcher", "admin"] | None = None
    is_active: bool | None = None
 
 
class PredictionRequest(BaseModel):
    lead_time: Literal[3, 6, 9, 12]
    sst_anom: float
    ohc_anom: float
    iod_dmi: float
    wind_anom: float
    atl_sst_anom: float
 
    def features(self) -> dict[str, float]:
        return {
            "sst_anom": self.sst_anom,
            "ohc_anom": self.ohc_anom,
            "iod_dmi": self.iod_dmi,
            "wind_anom": self.wind_anom,
            "atl_sst_anom": self.atl_sst_anom,
        }
 
 
class Contribution(BaseModel):
    feature: str
    label: str
    value: float
    shap_extreme: float
    shap_predicted: float
 
 
class PredictionResult(BaseModel):
    predicted_class: str
    probabilities: dict[str, float]
    contributions: list[Contribution]
 
 
class PredictionOut(PredictionResult):
    model_config = ConfigDict(from_attributes=True)
 
    id: int
    lead_time: int
    inputs: dict[str, float]
    created_at: datetime

