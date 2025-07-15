# models.py - Enhanced version with terms acceptance
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Profile information
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(DateTime)
    height = Column(Float)  # in cm
    weight = Column(Float)  # in kg
    activity_level = Column(String)  # sedentary, lightly_active, moderately_active, very_active
    
    # Terms acceptance tracking
    terms_accepted = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime)
    terms_version = Column(String)  # Hash of terms content when accepted
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activities = relationship("Activity", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    user_stats = relationship("UserStats", back_populates="user", uselist=False)
    terms_acceptances = relationship("TermsAcceptance", back_populates="user")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    distance = Column(Float)  # in km
    calories_burned = Column(Integer)
    notes = Column(String)
    date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
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
    total_distance = Column(Float, default=0.0)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for pre-registration acceptance
    session_id = Column(String, nullable=False)  # Unique session identifier
    terms_version = Column(String, nullable=False)  # Hash of terms content
    ip_address = Column(String)
    user_agent = Column(String)
    accepted_at = Column(DateTime, default=datetime.utcnow)
    
    # For tracking acceptance before registration
    email = Column(String)  # Store email for pre-registration tracking
    username = Column(String)  # Store username for pre-registration tracking
    
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