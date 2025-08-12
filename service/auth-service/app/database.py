from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import text
import os
import logging

logger = logging.getLogger(__name__)

# Railway PostgreSQL 환경변수 사용
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다. Railway에서 DATABASE_URL을 설정해주세요.")
    logger.warning("로컬 개발 환경에서는 .env 파일을 확인해주세요.")
    raise ValueError("DATABASE_URL environment variable is required")

logger.info(f"🔗 DATABASE_URL 환경변수 확인: {DATABASE_URL[:20]}...{DATABASE_URL[-20:] if len(DATABASE_URL) > 40 else ''}")

# SQLAlchemy Async 엔진 생성
try:
    logger.info("🚀 Railway PostgreSQL Async 연결 시도 중...")
    
    # Async 엔진 생성
    engine = create_async_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # 연결 상태 확인
        pool_recycle=300,     # 5분마다 연결 재생성
        echo=False            # SQL 로그 비활성화
    )
    
    # Async 세션 팩토리 생성
    SessionLocal = async_sessionmaker(
        engine, 
        expire_on_commit=False, 
        class_=AsyncSession
    )
    
    logger.info(f"🎯 Async Database engine created successfully with Railway PostgreSQL")
    
except Exception as e:
    logger.error(f"❌ Railway PostgreSQL Async 연결 실패: {e}")
    logger.error(f"🔍 DATABASE_URL 형식 확인: {DATABASE_URL}")
    logger.error(f"💡 연결 형식 예시: postgresql+asyncpg://user:password@host:port/database")
    engine = None
    SessionLocal = None

# Base 클래스 생성
Base = declarative_base()

# Async 데이터베이스 세션 의존성
async def get_db():
    if not SessionLocal:
        logger.warning("⚠️ Database session not available, returning None")
        yield None
        return
    
    try:
        async with SessionLocal() as db:
            logger.info("✅ Async Database session created successfully")
            yield db
    except Exception as e:
        logger.error(f"❌ Async Database session error: {e}")
        logger.error(f"🔍 SessionLocal: {SessionLocal}")
        logger.error(f"🔍 Engine: {engine}")
        raise
    finally:
        logger.info("🔒 Async Database session closed")

# Async 연결 상태 확인 함수
async def check_database_connection():
    """Async 데이터베이스 연결 상태를 확인하는 함수"""
    try:
        if not engine:
            logger.error("❌ Database engine is not available")
            return False
            
        async with engine.begin() as connection:
            result = await connection.execute(text("SELECT 1"))
            await result.fetchone()
            logger.info("✅ Async Database connection check: SUCCESS")
            return True
    except Exception as e:
        logger.error(f"❌ Async Database connection check: FAILED - {e}")
        return False

# 연결 테스트 함수 (Async)
async def test_database_connection():
    """Async 데이터베이스 연결을 테스트하는 함수"""
    try:
        logger.info("🔍 Async 데이터베이스 연결 테스트 중...")
        
        async with engine.begin() as connection:
            # PostgreSQL 버전 확인
            result = await connection.execute(text("SELECT version()"))
            version = (await result.fetchone())[0]
            logger.info(f"✅ Railway PostgreSQL Async 연결 성공! 버전: {version}")
            
            # 데이터베이스 정보 확인
            result = await connection.execute(text("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()"))
            db_info = await result.fetchone()
            logger.info(f"📊 데이터베이스 정보: DB={db_info[0]}, User={db_info[1]}, Host={db_info[2]}, Port={db_info[3]}")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Async Database connection test failed: {e}")
        return False
