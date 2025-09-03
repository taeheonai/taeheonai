"""
Middleissue Domain Entity - SQLAlchemy 모델
"""
from sqlalchemy import Column, Integer, Text, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

# Base 클래스 정의
Base = declarative_base()

class MiddleIssueEntity(Base):
    """중간 이슈 SQLAlchemy 모델 - issuepool 테이블"""
    __tablename__ = "issuepool"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corporation_id = Column(Integer, ForeignKey("corporation.id"), nullable=False)
    publish_year = Column(Text, nullable=True)  # 실제 DB에서는 text 타입
    ranking = Column(Text, nullable=False)      # 실제 DB에서는 text 타입
    base_issue_pool = Column(Text, nullable=False)
    issue_pool = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("materiality_category.id"), nullable=False)
    esg_classification_id = Column(Integer, ForeignKey("esg_classification.id"), nullable=False)

class CorporationEntity(Base):
    """기업 정보 SQLAlchemy 모델 - corporation 테이블"""
    __tablename__ = "corporation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corp_code = Column(String(100), nullable=False)
    companyname = Column(String(100), nullable=False)
    market = Column(String(100), nullable=False)
    dart_code = Column(String(100), nullable=False)

class ESGClassificationEntity(Base):
    """ESG 분류 SQLAlchemy 모델 - esg_classification 테이블"""
    __tablename__ = "esg_classification"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    esg = Column(Text, nullable=False)  # 실제 DB에서는 'esg' 컬럼명 사용

class CategoryEntity(Base):
    """카테고리 기준 SQLAlchemy 모델 - materiality_category 테이블"""
    __tablename__ = "materiality_category"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_name = Column(Text, nullable=False)  # 실제 DB에서는 'category_name' 컬럼명 사용
    esg_classification_id = Column(Integer, ForeignKey("esg_classification.id"), nullable=False)

# 크롤링 데이터 관련 Entity들 (기존 유지)
class CrawledArticleEntity(Base):
    """크롤링된 기사 데이터 SQLAlchemy 모델"""
    __tablename__ = "crawled_articles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company = Column(Text, nullable=False)
    issue = Column(Text, nullable=False)
    original_category = Column(Text, nullable=False)
    query_kind = Column(Text, nullable=False)
    keyword = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    pubDate = Column(Text, nullable=False)
    originallink = Column(Text, nullable=False)
    created_at = Column(Text, nullable=True)
    updated_at = Column(Text, nullable=True)