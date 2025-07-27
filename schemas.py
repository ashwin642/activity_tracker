# schemas.py - Enhanced version with role-based access control
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import enum

# Role and Permission Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    exercise_tracker = "exercise_tracker"
    wellness_tracker = "wellness_tracker"

class Permission(str, Enum):
    # Activity permissions
    view_activities = "view_activities"
    create_activities = "create_activities"
    edit_activities = "edit_activities"
    delete_activities = "delete_activities"
    
    # Goal permissions
    view_goals = "view_goals"
    create_goals = "create_goals"
    edit_goals = "edit_goals"
    delete_goals = "delete_goals"
    
    # User management permissions
    view_users = "view_users"
    create_users = "create_users"
    edit_users = "edit_users"
    delete_users = "delete_users"
    
    # Statistics permissions
    view_stats = "view_stats"
    view_all_stats = "view_all_stats"
    
    # Admin permissions
    manage_roles = "manage_roles"
    view_audit_logs = "view_audit_logs"
    manage_system = "manage_system"

# Terms and Conditions Schemas
class TermsRequest(BaseModel):
    """Request to get current terms and conditions"""
    pass

class TermsResponse(BaseModel):
    """Response with current terms and conditions"""
    content: str
    version: str
    version_hash: str
    effective_date: datetime

class TermsAcceptanceRequest(BaseModel):
    """Request to accept terms and conditions"""
    terms_version_hash: str
    user_identifier: str  # email or username for pre-registration
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class TermsAcceptanceResponse(BaseModel):
    """Response after accepting terms"""
    terms_token: str
    session_id: str
    expires_at: datetime
    message: str

# User Schemas
class UserBase(BaseModel):
    username: str
    email: str
    role: UserRole = UserRole.exercise_tracker

class UserCreate(UserBase):
    password: str
    permissions: Optional[List[Permission]] = None
    created_by: Optional[int] = None  # ID of admin who created this user
    
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

class exercise_trackerCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
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
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v

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
    is_active: Optional[bool] = None
    permissions: Optional[List[Permission]] = None

class exercise_trackerUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activity_level: Optional[str] = None
    terms_accepted: bool
    terms_accepted_at: Optional[datetime] = None
    terms_version: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    permissions: Optional[List[Permission]] = None

    class Config:
        orm_mode = True

class exercise_trackerOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    permissions: Optional[List[Permission]] = None

    class Config:
        orm_mode = True

# Permission Schemas
class UserPermissionOut(BaseModel):
    id: int
    user_id: int
    permission: Permission
    granted_by: int
    granted_at: datetime

    class Config:
        orm_mode = True

class PermissionAssignment(BaseModel):
    user_id: int
    permissions: List[Permission]

# Activity Schemas
class ActivityBase(BaseModel):
    activity_name: str
    duration: int  # in minutes
    #distance: Optional[float] = None  # in km
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    date: datetime

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    activity_name: Optional[str] = None
    duration: Optional[int] = None
    #distance: Optional[float] = None
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
    #total_distance: float
    total_calories: int
    total_duration: int
    avg_calories_per_day: float
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Audit Log Schema
class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    username: Optional[str] = None
    user_role: Optional[UserRole] = None

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

class AdminDashboardData(BaseModel):
    user: UserOut
    recent_activities: List[ActivityOut]
    active_goals: List[GoalOut]
    user_stats: Optional[UserStatsOut] = None
    weekly_summary: dict
    monthly_summary: dict
    exercise_tracker_count: int
    recent_exercise_trackers: List[exercise_trackerOut]
    system_stats: dict

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

# Error response schema
class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None

# Wellness Tracker schemas
class WellnessTrackerCreate(BaseModel):
    username: str
    email: str
    password: str

class WellnessTrackerUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

# Wellness-specific activity schemas
class NutritionCreate(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    food_items: str
    calories: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    notes: Optional[str] = None

class SleepCreate(BaseModel):
    bedtime: datetime
    wake_time: datetime
    sleep_quality: int  # 1-10 scale
    sleep_duration: Optional[int] = None  # in minutes
    notes: Optional[str] = None

class MoodCreate(BaseModel):
    mood_rating: int  # 1-10 scale
    mood_type: str  # happy, sad, anxious, calm, etc.
    energy_level: Optional[int] = None  # 1-10 scale
    stress_level: Optional[int] = None  # 1-10 scale
    notes: Optional[str] = None

class MeditationCreate(BaseModel):
    duration: int  # in minutes
    meditation_type: str  # mindfulness, breathing, guided, etc.
    notes: Optional[str] = None

class HydrationCreate(BaseModel):
    water_intake: float  # in liters or cups
    time_logged: datetime
    notes: Optional[str] = None