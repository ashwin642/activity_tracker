# auth.py - Enhanced version with Role-Based Access Control
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import models
from database import SessionLocal
import os
import uuid
import hashlib
from functools import wraps

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
TERMS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with role information."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type_claim: str = payload.get("type")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if token_type_claim != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected {token_type}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> models.User:
    """Get the current authenticated user."""
    token = credentials.credentials
    payload = verify_token(token, "access")
    username = payload.get("sub")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Role-based access control functions

def get_user_permissions(user: models.User, db: Session) -> Dict[str, List[str]]:
    """Get user permissions grouped by module."""
    permissions = {}
    
    if user.role == models.UserRole.ADMIN:
        # Admins have all permissions
        for module in models.PermissionModule:
            permissions[module.value] = [action.value for action in models.PermissionAction]
    else:
        # Get specific permissions for sub-users
        user_perms = db.query(models.UserPermission).filter(
            models.UserPermission.user_id == user.id,
            models.UserPermission.granted == True
        ).all()
        
        for perm in user_perms:
            if perm.module.value not in permissions:
                permissions[perm.module.value] = []
            permissions[perm.module.value].append(perm.action.value)
    
    return permissions

def check_permission(user: models.User, module: models.PermissionModule, action: models.PermissionAction, db: Session) -> bool:
    """Check if user has specific permission."""
    if user.role == models.UserRole.ADMIN:
        return True
    
    # Check specific permission for sub-user
    permission = db.query(models.UserPermission).filter(
        models.UserPermission.user_id == user.id,
        models.UserPermission.module == module,
        models.UserPermission.action == action,
        models.UserPermission.granted == True
    ).first()
    
    return permission is not None

def log_audit_event(
    user: models.User,
    action: str,
    resource_type: str = None,
    resource_id: int = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None,
    db: Session = None
):
    """Log an audit event."""
    if db is None:
        db = SessionLocal()
        close_db = True
    else:
        close_db = False
    
    try:
        audit_log = models.AuditLog(
            user_id=user.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()
    finally:
        if close_db:
            db.close()

# Role-based dependencies

def admin_required(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> models.User:
    """Dependency to ensure user is an admin."""
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def role_required(allowed_roles: List[models.UserRole]):
    """Dependency factory for role-based access control."""
    def _role_required(
        current_user: models.User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {' or '.join([role.value for role in allowed_roles])}"
            )
        return current_user
    return _role_required

def permission_required(module: models.PermissionModule, action: models.PermissionAction):
    """Dependency factory for permission-based access control."""
    def _permission_required(
        current_user: models.User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        if not check_permission(current_user, module, action, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {action.value} on {module.value}"
            )
        return current_user
    return _permission_required

# Request context helpers

def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host

def get_user_agent(request: Request) -> str:
    """Get user agent from request."""
    return request.headers.get("User-Agent", "")

# Session management

def create_user_session(user: models.User, access_token: str, refresh_token: str, 
                       ip_address: str, user_agent: str, db: Session) -> models.Session:
    """Create a new user session."""
    # Invalidate old sessions (optional - for single session per user)
    # db.query(models.Session).filter(
    #     models.Session.user_id == user.id,
    #     models.Session.is_active == True
    # ).update({"is_active": False})
    
    session = models.Session(
        user_id=user.id,
        session_token=access_token,
        refresh_token=refresh_token,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def invalidate_user_session(user: models.User, session_token: str, db: Session):
    """Invalidate a user session."""
    session = db.query(models.Session).filter(
        models.Session.user_id == user.id,
        models.Session.session_token == session_token,
        models.Session.is_active == True
    ).first()
    
    if session:
        session.is_active = False
        db.commit()

# Initialize default permissions for roles

def init_default_permissions(db: Session):
    """Initialize default permissions for roles."""
    # Admin permissions (all permissions)
    admin_permissions = [
        (models.UserRole.ADMIN, models.PermissionModule.USER_MANAGEMENT, models.PermissionAction.CREATE),
        (models.UserRole.ADMIN, models.PermissionModule.USER_MANAGEMENT, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.USER_MANAGEMENT, models.PermissionAction.UPDATE),
        (models.UserRole.ADMIN, models.PermissionModule.USER_MANAGEMENT, models.PermissionAction.DELETE),
        (models.UserRole.ADMIN, models.PermissionModule.ACTIVITIES, models.PermissionAction.CREATE),
        (models.UserRole.ADMIN, models.PermissionModule.ACTIVITIES, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.ACTIVITIES, models.PermissionAction.UPDATE),
        (models.UserRole.ADMIN, models.PermissionModule.ACTIVITIES, models.PermissionAction.DELETE),
        (models.UserRole.ADMIN, models.PermissionModule.GOALS, models.PermissionAction.CREATE),
        (models.UserRole.ADMIN, models.PermissionModule.GOALS, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.GOALS, models.PermissionAction.UPDATE),
        (models.UserRole.ADMIN, models.PermissionModule.GOALS, models.PermissionAction.DELETE),
        (models.UserRole.ADMIN, models.PermissionModule.DASHBOARD, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.REPORTS, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.PROFILE, models.PermissionAction.READ),
        (models.UserRole.ADMIN, models.PermissionModule.PROFILE, models.PermissionAction.UPDATE),
    ]
    
    # Sub-user default permissions (limited)
    subuser_permissions = [
        (models.UserRole.SUBUSER, models.PermissionModule.ACTIVITIES, models.PermissionAction.CREATE),
        (models.UserRole.SUBUSER, models.PermissionModule.ACTIVITIES, models.PermissionAction.READ),
        (models.UserRole.SUBUSER, models.PermissionModule.ACTIVITIES, models.PermissionAction.UPDATE),
        (models.UserRole.SUBUSER, models.PermissionModule.GOALS, models.PermissionAction.CREATE),
        (models.UserRole.SUBUSER, models.PermissionModule.GOALS, models.PermissionAction.READ),
        (models.UserRole.SUBUSER, models.PermissionModule.GOALS, models.PermissionAction.UPDATE),
        (models.UserRole.SUBUSER, models.PermissionModule.DASHBOARD, models.PermissionAction.READ),
        (models.UserRole.SUBUSER, models.PermissionModule.PROFILE, models.PermissionAction.READ),
        (models.UserRole.SUBUSER, models.PermissionModule.PROFILE, models.PermissionAction.UPDATE),
    ]
    
    all_permissions = admin_permissions + subuser_permissions
    
    for role, module, action in all_permissions:
        existing = db.query(models.RolePermission).filter(
            models.RolePermission.role == role,
            models.RolePermission.module == module,
            models.RolePermission.action == action
        ).first()
        
        if not existing:
            role_perm = models.RolePermission(
                role=role,
                module=module,
                action=action,
                allowed=True
            )
            db.add(role_perm)
    
    db.commit()

# Legacy functions for backward compatibility
def create_terms_token(user_identifier: str) -> str:
    """Create a terms acceptance token."""
    to_encode = {
        "sub": user_identifier,
        "exp": datetime.utcnow() + timedelta(hours=TERMS_TOKEN_EXPIRE_HOURS),
        "type": "terms",
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_terms_token(token: str) -> dict:
    """Verify a terms acceptance token and return payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type_claim: str = payload.get("type")
        
        if token_type_claim != "terms":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid terms token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired terms token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def generate_session_id() -> str:
    """Generate a unique session ID for terms acceptance."""
    return str(uuid.uuid4())

def hash_terms_version(terms_content: str) -> str:
    """Generate a hash of the terms content for version tracking."""
    return hashlib.sha256(terms_content.encode()).hexdigest()