# main.py - Enhanced version with dashboard functionality
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from database import SessionLocal, engine
import models, schemas
from datetime import timedelta, datetime, date
from typing import List, Optional
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

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Activity Tracker API", 
    version="2.0.0",
    description="""
    A comprehensive activity tracker API with dashboard functionality:
    
    **Authentication Flow:**
    1. **New Users**: Use `/register` to create account and get JWT tokens
    2. **Existing Users**: Use `/auth/authenticate` to get JWT tokens with username/password
    3. **Dashboard**: Use `/dashboard` to get complete user dashboard data
    4. **Protected Endpoints**: All activity/goal endpoints require valid JWT tokens
    
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

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_user_stats(user_id: int, db: Session):
    """Calculate and update user statistics"""
    activities = db.query(models.Activity).filter(models.Activity.user_id == user_id).all()
    
    if not activities:
        return {
            "total_activities": 0,
            "total_distance": 0.0,
            "total_calories": 0,
            "total_duration": 0,
            "avg_calories_per_day": 0.0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None
        }
    
    total_activities = len(activities)
    total_distance = sum(a.distance or 0 for a in activities)
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
        "total_distance": total_distance,
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

# Authentication Endpoints
@app.post("/auth/authenticate", response_model=schemas.Token)
def authenticate_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """Initial authentication endpoint - No JWT required, returns tokens"""
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
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, 
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": db_user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/register", response_model=schemas.Token)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user - No authentication required, returns JWT tokens"""
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create initial user stats
    user_stats = models.UserStats(user_id=new_user.id)
    db.add(user_stats)
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, 
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": new_user.username})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/auth/logout")
def logout_user(current_user: models.User = Depends(get_current_active_user)):
    """Logout endpoint - Requires JWT authentication"""
    return {"message": f"User {current_user.username} logged out successfully"}

@app.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """Get current user information - Requires JWT authentication"""
    return current_user

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
        "total_distance": sum(a.distance or 0 for a in weekly_activities),
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
        "total_distance": sum(a.distance or 0 for a in monthly_activities),
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
@app.post("/activities", response_model=schemas.ActivityOut)
def create_activity(
    activity: schemas.ActivityCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new activity"""
    db_activity = models.Activity(
        user_id=current_user.id,
        **activity.dict()
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    
    # Update user stats
    get_or_create_user_stats(current_user.id, db)
    
    return db_activity

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

@app.get("/activities/{activity_id}", response_model=schemas.ActivityOut)
def get_activity(
    activity_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific activity"""
    activity = db.query(models.Activity).filter(
        models.Activity.id == activity_id,
        models.Activity.user_id == current_user.id
    ).first()
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)