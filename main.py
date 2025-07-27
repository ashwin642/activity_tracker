# main.py - Enhanced version with terms & conditions and auth token system
from fastapi import FastAPI, Depends, HTTPException, status, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from database import SessionLocal, engine
import models, schemas
from datetime import timedelta, datetime, date
from typing import List, Optional
import secrets
import hashlib
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    security
)
from enum import Enum
import json
from typing import Dict, Any
from pydantic import BaseModel
from typing import Optional, List
import enum

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Define user roles
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    exercise_tracker = "exercise_tracker"

# Define permissions
class Permission(str, Enum):
    READ_ACTIVITIES = "read_activities"
    WRITE_ACTIVITIES = "write_activities"
    DELETE_ACTIVITIES = "delete_activities"
    READ_GOALS = "read_goals"
    WRITE_GOALS = "write_goals"
    DELETE_GOALS = "delete_goals"
    READ_STATS = "read_stats"
    MANAGE_PROFILE = "manage_profile"
    MANAGE_exercise_trackers = "manage_exercise_trackers"
    VIEW_AUDIT_LOGS = "view_audit_logs"

ROLE_PERMISSIONS: Dict[UserRole, List[Permission]] = {
    UserRole.ADMIN: [
        Permission.READ_ACTIVITIES,
        Permission.WRITE_ACTIVITIES, 
        Permission.DELETE_ACTIVITIES,
        Permission.READ_GOALS,
        Permission.WRITE_GOALS,
        Permission.DELETE_GOALS,
        Permission.READ_STATS,
        Permission.MANAGE_PROFILE,
        Permission.MANAGE_exercise_trackers,
        Permission.VIEW_AUDIT_LOGS
    ],
    UserRole.exercise_tracker: [
        Permission.READ_ACTIVITIES,
        Permission.WRITE_ACTIVITIES, 
        Permission.DELETE_ACTIVITIES,
        Permission.READ_GOALS,
        Permission.WRITE_GOALS,
        Permission.DELETE_GOALS,
        Permission.READ_STATS,
        Permission.MANAGE_PROFILE
    ]
}
# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Activity Tracker API", 
    version="2.0.0",
    description="""
    A comprehensive activity tracker API with dashboard functionality:
    
    **Authentication Flow:**
    1. **Terms Agreement**: Use `/terms/agree` to accept terms and get auth token
    2. **New Users**: Use `/register` with auth token to create account and get JWT tokens
    3. **Existing Users**: Use `/login` with auth token to get JWT tokens
    4. **Dashboard**: Use `/dashboard` to get complete user dashboard data
    5. **Protected Endpoints**: All activity/goal endpoints require valid JWT tokens
    
    **Dashboard Features:**
    - User profile information
    - Recent activities
    - Active goals and progress
    - Statistics and analytics
    - Weekly and monthly summaries
    """
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://ideal-invention-x59xp7gvv4g926xr9-3000.app.github.dev",
        "https://ideal-invention-x59xp7gvv4g926xr9-5173.app.github.dev",
        "https://*.app.github.dev"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# In-memory store for auth tokens (in production, use Redis or database)
auth_tokens = {}

# Terms and Conditions text
TERMS_AND_CONDITIONS = """
ACTIVITY TRACKER - TERMS AND CONDITIONS

1. ACCEPTANCE OF TERMS
By using this Activity Tracker application, you agree to be bound by these terms and conditions.

2. USER RESPONSIBILITIES
- You are responsible for maintaining the accuracy of your activity data
- You must not share your account credentials with others
- You must use the service in accordance with applicable laws

3. DATA PRIVACY
- We collect and store your activity data to provide the service
- Your personal information will be handled according to our privacy policy
- We do not sell your personal data to third parties

4. SERVICE AVAILABILITY
- We strive to maintain 99% uptime but cannot guarantee uninterrupted service
- We reserve the right to perform maintenance that may temporarily affect service

5. LIMITATION OF LIABILITY
- The service is provided "as is" without warranties
- We are not liable for any indirect, incidental, or consequential damages

6. MODIFICATIONS
- We may modify these terms at any time with notice to users
- Continued use of the service constitutes acceptance of modified terms

7. TERMINATION
- You may terminate your account at any time
- We may terminate accounts that violate these terms

By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.

Last Updated: July 14, 2025
"""

def generate_auth_token():
    """Generate a secure auth token"""
    return secrets.token_urlsafe(32)

def verify_auth_token(token: str) -> bool:
    """Verify if auth token is valid"""
    return token in auth_tokens and auth_tokens[token]["valid"]

def get_auth_token_from_header(x_auth_token: Optional[str] = Header(None)):
    """Dependency to extract and validate auth token from headers"""
    if not x_auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth token required. Please agree to terms and conditions first.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_auth_token(x_auth_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired auth token. Please agree to terms and conditions again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return x_auth_token

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
def get_admin_user(current_user: models.User = Depends(get_current_active_user)):
    """Dependency to ensure current user is an admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def get_role_permissions(role: UserRole) -> List[str]:
    """Get the fixed permissions for a role"""
    return [permission.value for permission in ROLE_PERMISSIONS[role]]

def has_permission(user_role: UserRole, required_permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    return required_permission in ROLE_PERMISSIONS[user_role]

def permission_required(required_permissions: List[Permission]):
    """Updated dependency factory for permission-based access control"""
    def check_permission(current_user: models.User = Depends(get_current_active_user)):
        user_role = UserRole(current_user.role)
        
        for permission in required_permissions:
            if not has_permission(user_role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {permission.value}"
                )
        return current_user
    return check_permission

def log_user_action(db: Session, user_id: int, action: str, details: str = None):
    """Log user actions for audit trail"""
    audit_log = models.AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        timestamp=datetime.now()
    )
    db.add(audit_log)
    db.commit()
def calculate_user_stats(user_id: int, db: Session):
    """Calculate and update user statistics"""
    activities = db.query(models.Activity).filter(models.Activity.user_id == user_id).all()
    
    if not activities:
        return {
            "total_activities": 0,
           # "total_distance": 0.0,
            "total_calories": 0,
            "total_duration": 0,
            "avg_calories_per_day": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None
        }
    
    total_activities = len(activities)
    #total_distance = sum(a.distance or 0 for a in activities)
    total_calories = sum(a.calories_burned or 0 for a in activities)
    total_duration = sum(a.duration or 0 for a in activities)
    
    # Calculate average calories per day
    if activities:
        first_activity = min(activities, key=lambda x: x.date)
        days_active = (datetime.now() - first_activity.date).days + 1
        avg_calories_per_day = total_calories / days_active if days_active > 0 else 0
    else:
        avg_calories_per_day = 0
    
    # Calculate streaks (simplified - consecutive days with activities)
    activity_dates = sorted(set(a.date.date() for a in activities))
    current_streak = 0
    longest_streak = 0
    temp_streak = 1
    
    if activity_dates:
        for i in range(len(activity_dates) - 1):
            if (activity_dates[i + 1] - activity_dates[i]).days == 1:
                temp_streak += 1
            else:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)
        
        # Current streak (from today backwards)
        today = date.today()
        if activity_dates and activity_dates[-1] == today:
            current_streak = 1
            for i in range(len(activity_dates) - 2, -1, -1):
                if (activity_dates[i + 1] - activity_dates[i]).days == 1:
                    current_streak += 1
                else:
                    break
    
    last_activity_date = max(activities, key=lambda x: x.date).date if activities else None
    
    return {
        "total_activities": total_activities,
        #"total_distance": total_distance,
        "total_calories": total_calories,
        "total_duration": total_duration,
        "avg_calories_per_day": avg_calories_per_day,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_activity_date": last_activity_date
    }

def get_or_create_user_stats(user_id: int, db: Session):
    """Get or create user stats record"""
    user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == user_id).first()
    
    if not user_stats:
        user_stats = models.UserStats(user_id=user_id)
        db.add(user_stats)
        db.commit()
        db.refresh(user_stats)
    
    # Update stats
    stats_data = calculate_user_stats(user_id, db)
    for key, value in stats_data.items():
        setattr(user_stats, key, value)
    
    db.commit()
    db.refresh(user_stats)
    return user_stats

@app.get("/")
def root():
    return {"message": "Activity Tracker API is running!", "version": "2.0.0"}

# Terms and Conditions Endpoints
@app.get("/terms")
def get_terms():
    """Get the terms and conditions text"""
    return {
        "terms": TERMS_AND_CONDITIONS,
        "message": "Please review and agree to the terms and conditions to continue"
    }

@app.post("/terms/agree")
def agree_to_terms():
    """Agree to terms and conditions and receive auth token"""
    auth_token = generate_auth_token()
    
    # Store token with timestamp (expires in 1 hour)
    auth_tokens[auth_token] = {
        "valid": True,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=1)
    }
    
    return {
        "message": "Terms and conditions accepted successfully",
        "auth_token": auth_token,
        "expires_in": 3600,  # 1 hour in seconds
        "note": "Use this auth token in the X-Auth-Token header for login/register"
    }

@app.get("/terms/status")
def check_terms_status(auth_token: str = Depends(get_auth_token_from_header)):
    """Check if user has agreed to terms (requires auth token)"""
    return {
        "agreed": True,
        "auth_token_valid": True,
        "message": "Terms and conditions have been accepted"
    }

@app.post("/login", response_model=schemas.Token)
def authenticate_user(
    user: schemas.UserLogin, 
    db: Session = Depends(get_db),
    auth_token: str = Depends(get_auth_token_from_header)
):
    """Login endpoint - Returns JWT with fixed role permissions"""
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account"
        )
    
    # Invalidate the auth token after successful login
    #if auth_token in auth_tokens:
        #auth_tokens[auth_token]["valid"] = False
    
    # Get fixed permissions for user's role
    user_role = UserRole(db_user.role)
    fixed_permissions = get_role_permissions(user_role)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": db_user.username,
            "role": db_user.role,
            "permissions": fixed_permissions  # Use fixed permissions
        }, 
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": db_user.username})
    
    # Log login action
    log_user_action(db, db_user.id, "LOGIN", f"User logged in with role: {db_user.role}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user,
        "permissions": fixed_permissions
    }

@app.post("/register")
async def register_user(user_data: UserCreate, db: Session = Depends(get_db), auth_token: str = Depends(get_auth_token_from_header)):
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(
            (models.User.username == user_data.username) | 
            (models.User.email == user_data.email)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="Username or email already registered"
            )
        
        # Validate role
        try:
            role = UserRole(user_data.role)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}"
            )
        
        # Hash the password
        hashed_password = get_password_hash(user_data.password)
        
        # Create new user with fixed role permissions
        new_user = models.User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            role=role,
            is_active=True,
            terms_accepted=True,
            terms_accepted_at=datetime.utcnow(),
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Get the fixed permissions for this role
        role_permissions = get_role_permissions(role)
        
        return {
            "message": "User registered successfully",
            "user_id": new_user.id,
            "username": new_user.username,
            "role": new_user.role.value,
            "permissions": role_permissions  # Show what permissions they have
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/auth/logout")
def logout_user(current_user: models.User = Depends(get_current_active_user)):
    """Logout endpoint - Requires JWT authentication"""
    return {"message": f"User {current_user.username} logged out successfully"}

@app.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """Get current user information with their fixed role permissions"""
    user_role = UserRole(current_user.role)
    user_permissions = get_role_permissions(user_role)
    
    return {
        **current_user.__dict__,
        "permissions": user_permissions  # Show current fixed permissions
    }

@app.get("/auth/verify-token")
def verify_user_token(current_user: models.User = Depends(get_current_active_user)):
    """Verify if the current token is valid - Requires JWT authentication"""
    return {
        "valid": True,
        "user_id": current_user.id,
        "username": current_user.username,
        "message": "Token is valid"
    }

@app.post("/auth/refresh", response_model=schemas.TokenResponse)
def refresh_token(token_data: schemas.TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    try:
        username = verify_token(token_data.refresh_token, "refresh")
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Dashboard Endpoint
@app.get("/dashboard", response_model=schemas.DashboardData)
def get_dashboard(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get complete dashboard data for the authenticated user"""
    
    # Get recent activities (last 10)
    recent_activities = db.query(models.Activity).filter(
        models.Activity.user_id == current_user.id
    ).order_by(desc(models.Activity.date)).limit(10).all()
    
    # Get active goals
    active_goals = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id,
        models.Goal.status == "active"
    ).all()
    
    # Get or update user stats
    user_stats = get_or_create_user_stats(current_user.id, db)
    
    # Calculate weekly summary (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    weekly_activities = db.query(models.Activity).filter(
        models.Activity.user_id == current_user.id,
        models.Activity.date >= week_ago
    ).all()
    
    weekly_summary = {
        "activities_count": len(weekly_activities),
        #"total_distance": sum(a.distance or 0 for a in weekly_activities),
        "total_calories": sum(a.calories_burned or 0 for a in weekly_activities),
        "total_duration": sum(a.duration or 0 for a in weekly_activities),
        "activity_types": list(set(a.activity_type for a in weekly_activities))
    }
    
    # Calculate monthly summary (last 30 days)
    month_ago = datetime.now() - timedelta(days=30)
    monthly_activities = db.query(models.Activity).filter(
        models.Activity.user_id == current_user.id,
        models.Activity.date >= month_ago
    ).all()
    
    monthly_summary = {
        "activities_count": len(monthly_activities),
        #"total_distance": sum(a.distance or 0 for a in monthly_activities),
        "total_calories": sum(a.calories_burned or 0 for a in monthly_activities),
        "total_duration": sum(a.duration or 0 for a in monthly_activities),
        "activity_types": list(set(a.activity_type for a in monthly_activities))
    }
    
    return {
        "user": current_user,
        "recent_activities": recent_activities,
        "active_goals": active_goals,
        "user_stats": user_stats,
        "weekly_summary": weekly_summary,
        "monthly_summary": monthly_summary
    }

# Activity Endpoints
def get_or_create_user_stats(user_id: int, db: Session):
    """Get or create user stats record with proper error handling"""
    try:
        user_stats = db.query(models.UserStats).filter(models.UserStats.user_id == user_id).first()
    except ValueError as e:
        # Handle date parsing errors by recreating the stats record
        if "Invalid isoformat string" in str(e):
            # Delete the corrupted stats record
            db.query(models.UserStats).filter(models.UserStats.user_id == user_id).delete(synchronize_session=False)
            db.commit()
            user_stats = None
        else:
            raise e
    
    if not user_stats:
        # Create new stats record
        user_stats = models.UserStats(user_id=user_id)
        db.add(user_stats)
        db.commit()
        db.refresh(user_stats)
    
    # Update stats with proper error handling
    try:
        stats_data = calculate_user_stats(user_id, db)
        for key, value in stats_data.items():
            # Handle date fields properly
            if key == "last_activity_date" and value is not None:
                # Ensure it's a proper date object
                if isinstance(value, str):
                    try:
                        value = datetime.strptime(value.split()[0], "%Y-%m-%d").date()
                    except (ValueError, IndexError):
                        value = None
            setattr(user_stats, key, value)
        
        db.commit()
        db.refresh(user_stats)
    except Exception as e:
        db.rollback()
        # If there's still an error, return basic stats
        user_stats = models.UserStats(
            user_id=user_id,
            total_activities=0,
            #total_distance=0.0,
            total_calories=0,
            total_duration=0,
            avg_calories_per_day=0.0,
            current_streak=0,
            longest_streak=0,
            last_activity_date=None
        )
        db.add(user_stats)
        db.commit()
        db.refresh(user_stats)
    
    return user_stats

def calculate_user_stats(user_id: int, db: Session):
    """Calculate and update user statistics with proper date handling"""
    try:
        activities = db.query(models.Activity).filter(models.Activity.user_id == user_id).all()
    except Exception as e:
        # If there's an error querying activities, return empty stats
        return {
            "total_activities": 0,
            #"total_distance": 0.0,
            "total_calories": 0,
            "total_duration": 0,
            "avg_calories_per_day": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None
        }
    
    if not activities:
        return {
            "total_activities": 0,
            #"total_distance": 0.0,
            "total_calories": 0,
            "total_duration": 0,
            "avg_calories_per_day": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None
        }
    
    total_activities = len(activities)
    #total_distance = sum(a.distance or 0 for a in activities)
    total_calories = sum(a.calories_burned or 0 for a in activities)
    total_duration = sum(a.duration or 0 for a in activities)
    
    # Calculate average calories per day
    if activities:
        first_activity = min(activities, key=lambda x: x.date)
        # Handle date properly
        if hasattr(first_activity.date, 'date'):
            first_date = first_activity.date.date()
        else:
            first_date = first_activity.date
        
        days_active = (date.today() - first_date).days + 1
        avg_calories_per_day = total_calories / days_active if days_active > 0 else 0
    else:
        avg_calories_per_day = 0
    
    # Calculate streaks (simplified - consecutive days with activities)
    try:
        activity_dates = []
        for a in activities:
            if hasattr(a.date, 'date'):
                activity_dates.append(a.date.date())
            else:
                activity_dates.append(a.date)
        
        activity_dates = sorted(set(activity_dates))
    except Exception:
        activity_dates = []
    
    current_streak = 0
    longest_streak = 0
    temp_streak = 1
    
    if activity_dates:
        for i in range(len(activity_dates) - 1):
            if (activity_dates[i + 1] - activity_dates[i]).days == 1:
                temp_streak += 1
            else:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)
        
        # Current streak (from today backwards)
        today = date.today()
        if activity_dates and activity_dates[-1] == today:
            current_streak = 1
            for i in range(len(activity_dates) - 2, -1, -1):
                if (activity_dates[i + 1] - activity_dates[i]).days == 1:
                    current_streak += 1
                else:
                    break
    
    # Handle last activity date properly
    last_activity_date = None
    if activities:
        try:
            last_activity = max(activities, key=lambda x: x.date)
            if hasattr(last_activity.date, 'date'):
                last_activity_date = last_activity.date.date()
            else:
                last_activity_date = last_activity.date
        except Exception:
            last_activity_date = None
    
    return {
        "total_activities": total_activities,
        #"total_distance": total_distance,
        "total_calories": total_calories,
        "total_duration": total_duration,
        "avg_calories_per_day": avg_calories_per_day,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_activity_date": last_activity_date
    }

@app.post("/activities", response_model=schemas.ActivityOut)
def create_activity(
    activity: schemas.ActivityCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new activity with proper error handling"""
    try:
        # Create the activity
        db_activity = models.Activity(
            user_id=current_user.id,
            **activity.dict()
        )
        db.add(db_activity)
        db.commit()
        db.refresh(db_activity)
        
        # Update user stats with error handling
        try:
            get_or_create_user_stats(current_user.id, db)
        except Exception as stats_error:
            # Log the error but don't fail the activity creation
            print(f"Warning: Failed to update user stats: {stats_error}")
        
        return db_activity
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create activity: {str(e)}"
        )

@app.get("/activities", response_model=List[schemas.ActivityOut])
def get_activities(
    skip: int = 0,
    limit: int = 100,
    activity_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's activities with optional filtering"""
    query = db.query(models.Activity).filter(models.Activity.user_id == current_user.id)
    
    if activity_type:
        query = query.filter(models.Activity.activity_type == activity_type)
    if start_date:
        query = query.filter(models.Activity.date >= start_date)
    if end_date:
        query = query.filter(models.Activity.date <= end_date)
    
    activities = query.order_by(desc(models.Activity.date)).offset(skip).limit(limit).all()
    return activities

@app.get("/activities", response_model=List[schemas.ActivityOut])
def get_activities(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,  # Changed from activity_type to category
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's activities with optional filtering"""
    query = db.query(models.Activity).filter(models.Activity.user_id == current_user.id)
    
    if category:  # Updated filter
        query = query.filter(models.Activity.category == category)
    if start_date:
        query = query.filter(models.Activity.date >= start_date)
    if end_date:
        query = query.filter(models.Activity.date <= end_date)
    
    activities = query.order_by(desc(models.Activity.date)).offset(skip).limit(limit).all()
    return activities
    return activity

@app.put("/activities/{activity_id}", response_model=schemas.ActivityOut)
def update_activity(
    activity_id: int,
    activity_update: schemas.ActivityUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an activity"""
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.user_id == current_user.id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = activity_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)
    
    db.commit()
    db.refresh(activity)
    
    # Update user stats
    get_or_create_user_stats(current_user.id, db)
    
    return activity

@app.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an activity"""
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.user_id == current_user.id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    db.delete(activity)
    db.commit()
    
    # Update user stats
    get_or_create_user_stats(current_user.id, db)
    
    return {"message": "Activity deleted successfully"}

# Goal Endpoints
@app.post("/goals", response_model=schemas.GoalOut)
def create_goal(
    goal: schemas.GoalCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new goal"""
    db_goal = models.Goal(
        user_id=current_user.id,
        **goal.dict()
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@app.get("/goals", response_model=List[schemas.GoalOut])
def get_goals(
    status: Optional[str] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's goals"""
    query = db.query(models.Goal).filter(models.Goal.user_id == current_user.id)
    
    if status:
        query = query.filter(models.Goal.status == status)
    
    goals = query.order_by(desc(models.Goal.created_at)).all()
    return goals

@app.put("/goals/{goal_id}", response_model=schemas.GoalOut)
def update_goal(
    goal_id: int,
    goal_update: schemas.GoalUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a goal"""
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    return goal

# User Profile Endpoints
@app.get("/profile", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(get_current_active_user)):
    """Get user profile"""
    return current_user

@app.put("/profile", response_model=schemas.UserOut)
def update_profile(
    profile_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    update_data = profile_update.dict(exclude_unset=True)
    
    # Check for conflicts
    if "username" in update_data and update_data["username"] != current_user.username:
        existing_user = db.query(models.User).filter(
            models.User.username == update_data["username"],
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == update_data["email"],
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Update fields
    for field, value in update_data.items():
        if field == "password":
            setattr(current_user, "hashed_password", get_password_hash(value))
        else:
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Statistics Endpoint
@app.get("/stats", response_model=schemas.UserStatsOut)
def get_user_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user statistics"""
    user_stats = get_or_create_user_stats(current_user.id, db)
    return user_stats

# Health and utility endpoints
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}

# Cleanup expired auth tokens (run periodically)
@app.on_event("startup")
async def cleanup_expired_tokens():
    """Clean up expired auth tokens on startup"""
    current_time = datetime.now()
    expired_tokens = [
        token for token, data in auth_tokens.items() 
        if data["expires_at"] < current_time
    ]
    for token in expired_tokens:
        del auth_tokens[token]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

@app.post("/exercise_trackers", response_model=schemas.UserOut)
def create_exercise_tracker(
    user_data: schemas.exercise_trackerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Create a new sub-user (Admin only) - exercise_trackers get fixed permissions"""
    # Check if username/email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user_data.username) | 
        (models.User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    hashed_password = get_password_hash(user_data.password)
    
    # Create exercise_tracker with fixed exercise_tracker role and permissions
    new_exercise_tracker = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=UserRole.exercise_tracker,  # Always exercise_tracker role
        created_by=current_user.id
    )
    
    db.add(new_exercise_tracker)
    db.commit()
    db.refresh(new_exercise_tracker)
    
    # Create initial user stats
    user_stats = models.UserStats(user_id=new_exercise_tracker.id)
    db.add(user_stats)
    db.commit()
    
    # Log action
    exercise_tracker_permissions = get_role_permissions(UserRole.exercise_tracker)
    log_user_action(
        db, 
        current_user.id, 
        "CREATE_exercise_tracker", 
        f"Created sub-user: {new_exercise_tracker.username} with fixed permissions: {exercise_tracker_permissions}"
    )
    
    return new_exercise_tracker

@app.get("/exercise_trackers", response_model=List[schemas.UserOut])
def get_exercise_trackers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Get all sub-users (Admin only)"""
    exercise_trackers = db.query(models.User).filter(
        models.User.role == UserRole.exercise_tracker
    ).offset(skip).limit(limit).all()
    
    return exercise_trackers

@app.get("/exercise_trackers/{user_id}", response_model=schemas.UserOut)
def get_exercise_tracker(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Get specific sub-user (Admin only)"""
    exercise_tracker = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == UserRole.exercise_tracker
    ).first()
    
    if not exercise_tracker:
        raise HTTPException(status_code=404, detail="Sub-user not found")
    
    return exercise_tracker

@app.put("/exercise_trackers/{user_id}", response_model=schemas.UserOut)
def update_exercise_tracker(
    user_id: int,
    user_update: schemas.exercise_trackerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Update sub-user (Admin only)"""
    exercise_tracker = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == UserRole.exercise_tracker
    ).first()
    
    if not exercise_tracker:
        raise HTTPException(status_code=404, detail="Sub-user not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Check for username/email conflicts
    if "username" in update_data:
        existing = db.query(models.User).filter(
            models.User.username == update_data["username"],
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if "email" in update_data:
        existing = db.query(models.User).filter(
            models.User.email == update_data["email"],
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Update fields
    for field, value in update_data.items():
        if field == "password":
            setattr(exercise_tracker, "hashed_password", get_password_hash(value))
        elif field == "permissions":
            setattr(exercise_tracker, "permissions", json.dumps(value))
        else:
            setattr(exercise_tracker, field, value)
    
    db.commit()
    db.refresh(exercise_tracker)
    
    # Log action
    log_user_action(db, current_user.id, "UPDATE_exercise_tracker", f"Updated sub-user: {exercise_tracker.username}")
    
    return exercise_tracker

@app.delete("/exercise_trackers/{user_id}")
def delete_exercise_tracker(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Delete sub-user (Admin only)"""
    exercise_tracker = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.role == UserRole.exercise_tracker
    ).first()
    
    if not exercise_tracker:
        raise HTTPException(status_code=404, detail="Sub-user not found")
    
    username = exercise_tracker.username
    
    try:
        # Log action BEFORE deleting (while user still exists)
        log_user_action(db, current_user.id, "DELETE_exercise_tracker", f"Deleted sub-user: {username}")
        
        # Delete audit logs for this user first (or update them to reference the admin)
        # Option 1: Delete audit logs for this user
        db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).delete(synchronize_session=False)
        
        # Option 2: Alternative - Update audit logs to reference the admin who deleted the user
        # db.query(models.AuditLog).filter(models.AuditLog.user_id == user_id).update(
        #     {"user_id": current_user.id, "details": f"[User deleted] Original user_id: {user_id}. " + models.AuditLog.details},
        #     synchronize_session=False
        # )
        
        # Delete related data (activities, goals, stats)
        db.query(models.Activity).filter(models.Activity.user_id == user_id).delete(synchronize_session=False)
        db.query(models.Goal).filter(models.Goal.user_id == user_id).delete(synchronize_session=False)
        db.query(models.UserStats).filter(models.UserStats.user_id == user_id).delete(synchronize_session=False)
        
        # Delete user
        db.delete(exercise_tracker)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete sub-user: {str(e)}"
        )
    
    return {"message": f"Sub-user {username} deleted successfully"}

# Updated permissions endpoint - now shows fixed permissions per role
@app.get("/permissions")
def get_role_permissions_info(
    current_user: models.User = Depends(get_admin_user)
):
    """Get fixed permissions for each role (Admin only)"""
    return {
        "message": "Permissions are fixed per role and cannot be modified",
        "role_permissions": {
            UserRole.ADMIN.value: get_role_permissions(UserRole.ADMIN),
            UserRole.exercise_tracker.value: get_role_permissions(UserRole.exercise_tracker)
        },
        "note": "These permissions are hardcoded and cannot be changed"
    }

@app.get("/audit-logs", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    """Get audit logs (Admin only)"""
    query = db.query(models.AuditLog)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if start_date:
        query = query.filter(models.AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(models.AuditLog.timestamp <= end_date)
    
    logs = query.order_by(desc(models.AuditLog.timestamp)).offset(skip).limit(limit).all()
    return logs