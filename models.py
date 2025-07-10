from sqlalchemy import Boolean, Column, Integer, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # User profile information
    first_name = Column(String(50))
    last_name = Column(String(50))
    date_of_birth = Column(DateTime)
    height = Column(Float)  # in cm
    weight = Column(Float)  # in kg
    activity_level = Column(String(20), default="moderate")  # sedentary, light, moderate, active, very_active
    
    # Relationships
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    user_stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)  # running, walking, cycling, swimming, etc.
    duration = Column(Integer, nullable=False)  # in minutes
    distance = Column(Float)  # in kilometers
    calories_burned = Column(Integer)
    notes = Column(Text)
    date = Column(DateTime, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="activities")

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_type = Column(String(50), nullable=False)  # weight_loss, distance, calories, etc.
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0.0)
    target_date = Column(DateTime)
    status = Column(String(20), default="active")  # active, completed, paused
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="goals")

class UserStats(Base):
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_activities = Column(Integer, default=0)
    total_distance = Column(Float, default=0.0)  # in km
    total_calories = Column(Integer, default=0)
    total_duration = Column(Integer, default=0)  # in minutes
    avg_calories_per_day = Column(Float, default=0.0)
    current_streak = Column(Integer, default=0)  # days
    longest_streak = Column(Integer, default=0)  # days
    last_activity_date = Column(DateTime)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="user_stats")