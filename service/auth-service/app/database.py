from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

# Railway PostgreSQL 환경변수 사용
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다. Railway에서 DATABASE_URL을 설정해주세요.")
    logger.warning("로컬 개발 환경에서는 .env 파일을 확인해주세요.")
    raise ValueError("DATABASE_URL environment variable is required")

# SQLAlchemy 엔진 생성 (연결 오류 처리 추가)
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # 연결 상태 확인
        pool_recycle=300,     # 5분마다 연결 재생성
        echo=False            # SQL 로그 비활성화
    )
    logger.info(f"Database engine created successfully with URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    engine = None

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

# Base 클래스 생성
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    if not SessionLocal:
        logger.warning("Database session not available, returning None")
        yield None
        return
    
    try:
        db = SessionLocal()
        logger.info("Database session created successfully")
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        logger.error(f"SessionLocal: {SessionLocal}")
        logger.error(f"Engine: {engine}")
        if 'db' in locals() and db:
            try:
                db.rollback()
            except Exception as rollback_error:
                logger.error(f"Rollback error: {rollback_error}")
        raise
    finally:
        if 'db' in locals() and db:
            try:
                db.close()
                logger.info("Database session closed")
            except Exception as close_error:
                logger.error(f"Close error: {close_error}")
