from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, schemas
from datetime import timedelta
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Activity Tracker API", version="1.0.0")

# Add CORS middleware to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://ideal-invention-x59xp7gvv4g926xr9-3000.app.github.dev",
        "https://ideal-invention-x59xp7gvv4g926xr9-5173.app.github.dev",
        # Add wildcard for development (remove in production)
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

@app.get("/")
def root():
    return {"message": "Activity Tracker API is running!", "version": "1.0.0"}

@app.post("/login", response_model=schemas.Token)
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    # Find user by username in the users.db SQLite database
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password against hashed password stored in database
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print(f"Received registration request for user: {user.username}")  # Debug log
    
    # Check if username or email already exists in users.db
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    # Save to users.db SQLite database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"User {user.username} registered successfully")  # Debug log
    return new_user

@app.get("/me", response_model=schemas.UserOut)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Get the existing user from users.db
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username or email is being updated and already exists
    if user_update.username and user_update.username != db_user.username:
        existing_user = db.query(models.User).filter(
            models.User.username == user_update.username,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if user_update.email and user_update.email != db_user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Update fields if provided
    if user_update.username:
        db_user.username = user_update.username
    if user_update.email:
        db_user.email = user_update.email
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@app.patch("/users/{user_id}", response_model=schemas.UserOut)
def partial_update_user(user_id: int, user_update: schemas.UserPartialUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Get the existing user from users.db
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get only the fields that were actually sent in the request
    update_data = user_update.dict(exclude_unset=True)
    
    # Check for conflicts only for fields being updated
    if "username" in update_data and update_data["username"] != db_user.username:
        existing_user = db.query(models.User).filter(
            models.User.username == update_data["username"],
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    if "email" in update_data and update_data["email"] != db_user.email:
        existing_user = db.query(models.User).filter(
            models.User.email == update_data["email"],
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    # Update fields
    for field, value in update_data.items():
        if field == "password":
            setattr(db_user, "hashed_password", get_password_hash(value))
        else:
            setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.get("/users", response_model=list[schemas.UserOut])
def get_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# Add this for debugging
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)