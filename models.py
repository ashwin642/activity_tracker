# models.py - Enhanced version with Role-Based Access Control (FIXED)
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Date, Enum, JSON, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    exercise_tracker = "exercise_tracker"
    wellness_tracker = "wellness_tracker"

class PermissionModule(enum.Enum):
    ACTIVITIES = "activities"
    GOALS = "goals"
    DASHBOARD = "dashboard"
    REPORTS = "reports"
    PROFILE = "profile"
    USER_MANAGEMENT = "user_management"

class PermissionAction(enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Role-based access control
    role = Column(Enum(UserRole), default=UserRole.exercise_tracker, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who created this user
    
    # Profile information - COMMENTED OUT UNTIL MIGRATION IS RUN
    # first_name = Column(String)
    # last_name = Column(String)
    # date_of_birth = Column(DateTime)
    # height = Column(Float)  # in cm
    # weight = Column(Float)  # in kg
    # activity_level = Column(String)  # sedentary, lightly_active, moderately_active, very_active
    
    # Terms acceptance tracking - KEEPING FOR TOKEN GENERATION
    terms_accepted = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime)
    terms_version = Column(String)  # Hash of terms content when accepted
    
    # Audit fields
    last_login = Column(DateTime)
    login_count = Column(Integer, default=0)
    
    # Timestamps - KEEPING FOR FUNCTIONALITY
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - FIXED: Removed duplicates and fixed foreign_keys
    activities = relationship("Activity", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    user_stats = relationship("UserStats", back_populates="user", uselist=False)
    terms_acceptances = relationship("TermsAcceptance", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    # Role-based relationships
    created_users = relationship("User", remote_side=[id], backref="creator")
    
    # FIXED: User permissions with proper foreign_keys specification
    user_permissions = relationship(
        "UserPermission", 
        foreign_keys="UserPermission.user_id",
        back_populates="user"
    )
    
    granted_permissions = relationship(
        "UserPermission",
        foreign_keys="UserPermission.granted_by_user_id",
        back_populates="granted_by_user"
    )
    nutrition_entries = relationship("NutritionEntry", back_populates="user", cascade="all, delete-orphan")
    sleep_entries = relationship("SleepEntry", back_populates="user", cascade="all, delete-orphan")
    mood_entries = relationship("MoodEntry", back_populates="user", cascade="all, delete-orphan")
    meditation_entries = relationship("MeditationEntry", back_populates="user", cascade="all, delete-orphan")
    hydration_entries = relationship("HydrationEntry", back_populates="user", cascade="all, delete-orphan")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_name = Column(String(100), nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    #distance = Column(Float)  # in km
    calories_burned = Column(Integer)
    notes = Column(Text)
    date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())  # FIXED: Added func import
    
    user = relationship("User", back_populates="activities")
    
class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_type = Column(String, nullable=False)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0.0)
    target_date = Column(DateTime)
    status = Column(String, default="active")  # active, completed, paused, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="goals")

class UserStats(Base):
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_activities = Column(Integer, default=0)
    #total_distance = Column(Float, default=0.0)
    total_calories = Column(Integer, default=0)
    total_duration = Column(Integer, default=0)
    avg_calories_per_day = Column(Float, default=0.0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(Date)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_stats")

class TermsAcceptance(Base):
    __tablename__ = "terms_acceptances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    session_id = Column(String, nullable=False)
    terms_version = Column(String, nullable=False)
    ip_address = Column(String)
    user_agent = Column(String)
    accepted_at = Column(DateTime, default=datetime.utcnow)
    
    # For tracking acceptance before registration
    email = Column(String)
    username = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="terms_acceptances")

class TermsVersion(Base):
    __tablename__ = "terms_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_hash = Column(String, unique=True, nullable=False)
    content = Column(Text, nullable=False)
    version_number = Column(String, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    effective_date = Column(DateTime, nullable=False)

# Role-Based Access Control Tables

class UserPermission(Base):
    __tablename__ = "user_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission_name = Column(String(100), nullable=False)
    granted_by_user_id = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime, default=func.now())  # FIXED: Now func is imported
    
    # FIXED: Properly specify foreign_keys to resolve ambiguity
    user = relationship(
        "User", 
        foreign_keys=[user_id],
        back_populates="user_permissions"
    )
    
    granted_by_user = relationship(
        "User",
        foreign_keys=[granted_by_user_id],
        back_populates="granted_permissions"
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # login, logout, create_user, delete_activity, etc.
    resource_type = Column(String)  # user, activity, goal, etc.
    resource_id = Column(Integer)  # ID of the affected resource
    details = Column(JSON)  # Additional details about the action
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class RolePermission(Base):
    """Default permissions for each role"""
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole), nullable=False)
    module = Column(Enum(PermissionModule), nullable=False)
    action = Column(Enum(PermissionAction), nullable=False)
    allowed = Column(Boolean, default=True)
    
    # Unique constraint should be added in migration
    # UniqueConstraint('role', 'module', 'action', name='unique_role_permission')

class Session(Base):
    """Track user sessions for security"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String, unique=True, nullable=False)
    refresh_token = Column(String, unique=True, nullable=False)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User")
class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_type = Column(String(50), nullable=False)  # breakfast, lunch, dinner, snack
    food_items = Column(Text, nullable=False)
    calories = Column(Integer, nullable=True)
    protein = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)
    sugar = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="nutrition_entries")

class SleepEntry(Base):
    __tablename__ = "sleep_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bedtime = Column(DateTime, nullable=False)
    wake_time = Column(DateTime, nullable=False)
    sleep_quality = Column(Integer, nullable=False)  # 1-10 scale
    sleep_duration = Column(Integer, nullable=True)  # in minutes
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="sleep_entries")

class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_rating = Column(Integer, nullable=False)  # 1-10 scale
    mood_type = Column(String(100), nullable=False)  # happy, sad, anxious, calm, etc.
    energy_level = Column(Integer, nullable=True)  # 1-10 scale
    stress_level = Column(Integer, nullable=True)  # 1-10 scale
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="mood_entries")

class MeditationEntry(Base):
    __tablename__ = "meditation_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    meditation_type = Column(String(100), nullable=False)  # mindfulness, breathing, guided, etc.
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="meditation_entries")

class HydrationEntry(Base):
    __tablename__ = "hydration_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    water_intake = Column(Float, nullable=False)  # in liters or cups
    time_logged = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="hydration_entries")