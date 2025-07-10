# main.py - Enhanced version
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, schemas
from datetime import timedelta
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
    version="1.0.0",
    description="""
    A secure activity tracker API with unique JWT authentication flow:
    
    **Authentication Flow:**
    1. **New Users**: Use `/auth/register` to create account and get JWT tokens
    2. **Existing Users**: Use `/auth/authenticate` to get JWT tokens with username/password
    3. **Token-based Login**: Use `/auth/login` with JWT token + credentials for secure login
    4. **Protected Endpoints**: All other endpoints require valid JWT tokens
    
    **Token Management:**
    - Use `/auth/refresh` to refresh expired access tokens
    - Use `/auth/logout` to logout (requires token)
    - Use `/auth/verify-token` to check token validity
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

@app.get("/")
def root():
    return {"message": "Activity Tracker API is running!", "version": "1.0.0"}

@app.post("/auth/authenticate", response_model=schemas.Token)
def authenticate_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Initial authentication endpoint - No JWT required, returns tokens
    This is the entry point for users who already have accounts
    """
    # Find user by username
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account"
        )
    
    # Create tokens
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

@app.post("/login", response_model=schemas.UserOut)
def login_user(
    user: schemas.UserLogin, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Login endpoint - Requires JWT authentication (token-based login)
    """
    # Find user by username
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account"
        )
    
    # Verify that the authenticated user matches the login request
    if current_user.username != user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token user does not match login credentials"
        )
    
    return db_user

@app.post("/auth/refresh", response_model=schemas.TokenResponse)
def refresh_token(token_data: schemas.TokenRefresh, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token
    """
    try:
        username = verify_token(token_data.refresh_token, "refresh")
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Verify user still exists and is active
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/register", response_model=schemas.Token)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user - No authentication required, returns JWT tokens
    """
    print(f"Received registration request for user: {user.username}")
    
    # Check if username or email already exists
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"User {user.username} registered successfully")
    
    # Generate JWT tokens for the new user
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
    """
    Logout endpoint - Requires JWT authentication
    In a production app, you'd typically blacklist the token
    """
    return {"message": f"User {current_user.username} logged out successfully"}

@app.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """
    Get current user information - Requires JWT authentication
    """
    return current_user

@app.get("/auth/verify-token")
def verify_user_token(current_user: models.User = Depends(get_current_active_user)):
    """
    Verify if the current token is valid - Requires JWT authentication
    """
    return {
        "valid": True,
        "user_id": current_user.id,
        "username": current_user.username,
        "message": "Token is valid"
    }

# Protected user management endpoints
@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Get user by ID - Requires JWT authentication"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int, 
    user_update: schemas.UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Update user - Requires JWT authentication"""
    # Users can only update their own profile (or implement admin logic)
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for conflicts
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
    
    # Update fields
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
def partial_update_user(
    user_id: int, 
    user_update: schemas.UserPartialUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Partially update user - Requires JWT authentication"""
    # Users can only update their own profile
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Check for conflicts
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
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete user - Requires JWT authentication"""
    # Users can only delete their own account
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user"
        )
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.get("/users", response_model=list[schemas.UserOut])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all users - Requires JWT authentication"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# Public endpoints (no authentication required)
@app.get("/health")
def health_check():
    """Health check endpoint - No authentication required"""
    return {"status": "healthy", "message": "API is running"}

@app.get("/public/info")
def public_info():
    """Public information endpoint - No authentication required"""
    return {
        "message": "This is a public endpoint",
        "api_version": "1.0.0",
        "auth_required": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)