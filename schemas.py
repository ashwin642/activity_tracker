# schemas.py - Enhanced version with dashboard data
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None

class UserPartialUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Activity Schemas
class ActivityBase(BaseModel):
    activity_type: str
    duration: int  # in minutes
    distance: Optional[float] = None  # in km
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: datetime

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    activity_type: Optional[str] = None
    duration: Optional[int] = None
    distance: Optional[float] = None
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: Optional[datetime] = None

class ActivityOut(ActivityBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Goal Schemas
class GoalBase(BaseModel):
    goal_type: str
    target_value: float
    target_date: Optional[datetime] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    goal_type: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None

class GoalOut(GoalBase):
    id: int
    user_id: int
    current_value: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# User Stats Schema
class UserStatsOut(BaseModel):
    id: int
    user_id: int
    total_activities: int
    total_distance: float
    total_calories: int
    total_duration: int
    avg_calories_per_day: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Dashboard Schema
class DashboardData(BaseModel):
    user: UserOut
    recent_activities: List[ActivityOut]
    active_goals: List[GoalOut]
    user_stats: Optional[UserStatsOut] = None
    weekly_summary: dict
    monthly_summary: dict

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserOut

class TokenRefresh(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

# For password reset functionality (optional)
class PasswordReset(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str