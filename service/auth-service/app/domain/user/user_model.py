from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class UserModel(BaseModel):
    def __init__(self, user_id: str, company_id: str, industry: str, email: str, name: str, age: str, auth_id: str, auth_pw: str):
    pass