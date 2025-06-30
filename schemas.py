from pydantic import BaseModel, EmailStr
from typing import Optional
 
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

# Add these two schemas for update functionality
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class UserPartialUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
 
class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
 
    class Config:
        orm_mode = True
