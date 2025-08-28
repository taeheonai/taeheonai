from sqlalchemy import Column, String, Integer, DateTime, Text, ARRAY, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict, MutableList
from app.common.database import Base


class PolishEntity(Base):
    __tablename__ = "gri_polish"

    id = Column(Integer, primary_key=True, index=True)
    session_key = Column(String(100), nullable=False, index=True)
    gri_index = Column(String(20), nullable=False, index=True)
    polished_text = Column(Text, nullable=False)
    sources = Column(MutableList.as_mutable(ARRAY(JSON)), nullable=False)
    model = Column(String(50), nullable=False)
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
