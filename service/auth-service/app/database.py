from sqlalchemy import create_engine, text
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

logger.info(f"🔗 DATABASE_URL 환경변수 확인: {DATABASE_URL[:20]}...{DATABASE_URL[-20:] if len(DATABASE_URL) > 40 else ''}")

# SQLAlchemy 엔진 생성 (연결 오류 처리 추가)
try:
    logger.info("🚀 Railway PostgreSQL 연결 시도 중...")
    
    # asyncpg 사용 시 호환되는 파라미터만 설정
    if "asyncpg" in DATABASE_URL:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # 연결 상태 확인
            pool_recycle=300,     # 5분마다 연결 재생성
            echo=False,           # SQL 로그 비활성화
            connect_args={
                "application_name": "taeheonai-auth-service"
            }
        )
    else:
        # psycopg2 사용 시 기존 파라미터 유지
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=False,
            connect_args={
                "connect_timeout": 10,
                "application_name": "taeheonai-auth-service"
            }
        )
    
    # 연결 테스트
    logger.info("🔍 데이터베이스 연결 테스트 중...")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        logger.info(f"✅ Railway PostgreSQL 연결 성공! 버전: {version}")
        
        # 데이터베이스 정보 확인
        result = connection.execute(text("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()"))
        db_info = result.fetchone()
        logger.info(f"📊 데이터베이스 정보: DB={db_info[0]}, User={db_info[1]}, Host={db_info[2]}, Port={db_info[3]}")
        
    logger.info(f"🎯 Database engine created successfully with Railway PostgreSQL")
    
except Exception as e:
    logger.error(f"❌ Railway PostgreSQL 연결 실패: {e}")
    logger.error(f"🔍 DATABASE_URL 형식 확인: {DATABASE_URL}")
    logger.error(f"💡 연결 형식 예시: postgresql+asyncpg://user:password@host:port/database")
    engine = None

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

# Base 클래스 생성
Base = declarative_base()

# 데이터베이스 세션 의존성
def get_db():
    if not SessionLocal:
        logger.warning("⚠️ Database session not available, returning None")
        yield None
        return
    
    try:
        db = SessionLocal()
        logger.info("✅ Database session created successfully")
        yield db
    except Exception as e:
        logger.error(f"❌ Database session error: {e}")
        logger.error(f"🔍 SessionLocal: {SessionLocal}")
        logger.error(f"🔍 Engine: {engine}")
        if 'db' in locals() and db:
            try:
                db.rollback()
                logger.info("🔄 Database rollback completed")
            except Exception as rollback_error:
                logger.error(f"❌ Rollback error: {rollback_error}")
        raise
    finally:
        if 'db' in locals() and db:
            try:
                db.close()
                logger.info("🔒 Database session closed")
            except Exception as close_error:
                logger.error(f"❌ Close error: {close_error}")

# 연결 상태 확인 함수
def check_database_connection():
    """데이터베이스 연결 상태를 확인하는 함수"""
    try:
        if not engine:
            logger.error("❌ Database engine is not available")
            return False
            
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("✅ Database connection check: SUCCESS")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection check: FAILED - {e}")
        return False
