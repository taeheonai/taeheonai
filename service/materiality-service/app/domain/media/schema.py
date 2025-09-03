"""
Media Schema - Pydantic BaseModel
"""
from pydantic import BaseModel
from typing import Optional

class MaterialityCategoryRequest(BaseModel):
    """중대성 카테고리 요청 스키마"""
    category_name: str
    esg_classification_id: int
