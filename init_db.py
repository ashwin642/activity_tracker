# init_db.py - Database initialization with sample data
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth import get_password_hash
from datetime import datetime, timedelta
import random

def create_sample_data():
    """Create sample data for testing the dashboard"""
    db = SessionLocal()
    
    try:
        # Create sample users if they don't exist
        sample_users = [
            {
                "username": "john_doe",
                "email": "john@example.com",
                "password": "password123",
                "first_name": "John",
                "last_name": "Doe",
                "height": 175.0,
                "weight": 70.0,
                "activity_level": "moderate"
            },
            {
                "username": "jane_smith",
                "email": "jane@example.com", 
                "password": "password123",
                "first_name": "Jane",
                "last_name": "Smith",
                "height": 165.0,
                "weight": 60.0,
                "activity_level": "active"
            }
        ]
        
        created_users = []
        for user_data in sample_users:
            # Check if user already exists
            existing_user = db.query(models.User).filter(
                models.User.username == user_data["username"]
            ).first()
            
            if not existing_user:
                password = user_data.pop("password")
                hashed_password = get_password_hash(password)
                
                user = models.User(
                    **user_data,
                    hashed_password=hashed_password
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                created_users.append(user)
                print(f"Created user: {user.username}")
            else:
                created_users.append(existing_user)
                print(f"User {existing_user.username} already exists")
        
        # Create sample activities for each user
        activity_types = ["running", "walking", "cycling", "swimming", "weightlifting", "yoga"]
        
        for user in created_users:
            # Check if user already has activities
            existing_activities = db.query(models.Activity).filter(
                models.Activity.user_id == user.id
            ).count()
            
            if existing_activities == 0:
                # Create activities for the last 30 days
                for i in range(30):
                    # Random chance of activity on each day
                    if random.random() < 0.7:  # 70% chance of activity
                        activity_date = datetime.now() - timedelta(days=i)
                        activity_type = random.choice(activity_types)
                        
                        # Generate realistic data based on activity type
                        if activity_type == "running":
                            duration = random.randint(30, 90)
                            distance = round(random.uniform(3, 15), 2)
                            calories = duration * random.randint(8, 12)
                        elif activity_type == "walking":
                            duration = random.randint(20, 60)
                            distance = round(random.uniform(1.5, 8), 2)
                            calories = duration * random.randint(4, 6)
                        elif activity_type == "cycling":
                            duration = random.randint(45, 120)
                            distance = round(random.uniform(10, 40), 2)
                            calories = duration * random.randint(6, 10)
                        elif activity_type == "swimming":
                            duration = random.randint(30, 75)
                            distance = round(random.uniform(1, 3), 2)
                            calories = duration * random.randint(10, 14)
                        elif activity_type == "weightlifting":
                            duration = random.randint(45, 90)
                            distance = None
                            calories = duration * random.randint(6, 9)
                        else:  # yoga
                            duration = random.randint(30, 90)
                            distance = None
                            calories = duration * random.randint(3, 5)
                        
                        activity = models.Activity(
                            user_id=user.id,
                            activity_type=activity_type,
                            duration=duration,
                            distance=distance,
                            calories_burned=calories,
                            date=activity_date,
                            notes=f"Sample {activity_type} activity"
                        )
                        db.add(activity)
                
                db.commit()
                print(f"Created sample activities for user: {user.username}")
        
        # Create sample goals for each user
        goal_types = ["weight_loss", "distance_monthly", "calories_daily", "duration_weekly"]
        
        for user in created_users:
            # Check if user already has goals
            existing_goals = db.query(models.Goal).filter(
                models.Goal.user_id == user.id
            ).count()
            
            if existing_goals == 0:
                for goal_type in random.sample(goal_types, 2):  # 2 random goals per user
                    if goal_type == "weight_loss":
                        target_value = round(random.uniform(5, 15), 1)
                        current_value = round(random.uniform(0, target_value * 0.6), 1)
                    elif goal_type == "distance_monthly":
                        target_value = round(random.uniform(50, 200), 1)
                        current_value = round(random.uniform(0, target_value * 0.7), 1)
                    elif goal_type == "calories_daily":
                        target_value = random.randint(300, 800)
                        current_value = random.randint(0, int(target_value * 0.8))
                    else:  # duration_weekly
                        target_value = random.randint(180, 420)  # 3-7 hours
                        current_value = random.randint(0, int(target_value * 0.8))
                    
                    goal = models.Goal(
                        user_id=user.id,
                        goal_type=goal_type,
                        target_value=target_value,
                        current_value=current_value,
                        target_date=datetime.now() + timedelta(days=random.randint(30, 90)),
                        status="active"
                    )
                    db.add(goal)
                
                db.commit()
                print(f"Created sample goals for user: {user.username}")
        
        # Create user stats for each user
        for user in created_users:
            existing_stats = db.query(models.UserStats).filter(
                models.UserStats.user_id == user.id
            ).first()
            
            if not existing_stats:
                stats = models.UserStats(
                    user_id=user.id,
                    total_activities=0,
                    total_distance=0.0,
                    total_calories=0,
                    total_duration=0,
                    avg_calories_per_day=0.0,
                    current_streak=0,
                    longest_streak=0
                )
                db.add(stats)
                db.commit()
                print(f"Created user stats for user: {user.username}")
        
        print("Sample data creation completed!")
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()

def init_database():
    """Initialize the database with tables and sample data"""
    print("Creating database tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Database tables created!")
    
    print("Creating sample data...")
    create_sample_data()
    print("Database initialization completed!")

if __name__ == "__main__":
    init_database()