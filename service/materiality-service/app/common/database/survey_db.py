"""
Materiality Service Database Configuration for Survey Tables
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

logger = logging.getLogger("materiality_service_survey_db")

# Railway PostgreSQL 연결 설정 (필수)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
    raise ValueError("DATABASE_URL 환경변수를 설정해주세요.")

# Railway PostgreSQL URL을 asyncpg용으로 변환
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

logger.info(f"✅ Railway PostgreSQL 연결 설정 완료: {DATABASE_URL.split('@')[0]}@***")

# 비동기 엔진 생성
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20
)

# 비동기 세션 팩토리
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base 클래스
Base = declarative_base()

# DB 세션 의존성
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 연결 테스트 함수
async def test_connection():
    """데이터베이스 연결을 테스트합니다."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ 데이터베이스 연결 성공")
        return True
    except Exception as e:
        logger.error(f"❌ 데이터베이스 연결 실패: {str(e)}")
        return False

# 테이블 생성 함수
async def create_tables():
    """설문 관련 테이블을 생성합니다."""
    try:
        from app.domain.survey.entity import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ 설문 관련 테이블 생성 완료")
        return True
    except Exception as e:
        logger.error(f"❌ 테이블 생성 실패: {str(e)}")
        return False

# 테이블 삭제 함수
async def drop_tables():
    """설문 관련 테이블을 삭제합니다. (주의: 모든 데이터가 손실됩니다)"""
    try:
        from app.domain.survey.entity import Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("✅ 설문 관련 테이블 삭제 완료")
        return True
    except Exception as e:
        logger.error(f"❌ 테이블 삭제 실패: {str(e)}")
        return False

# 동기 세션 (기존 코드와의 호환성을 위해)
from sqlalchemy import create_engine as create_sync_engine
from sqlalchemy.orm import sessionmaker as create_sync_sessionmaker, Session

# 동기 엔진 (테이블 생성용)
sync_engine = create_sync_engine(
    DATABASE_URL.replace("+asyncpg", ""),  # asyncpg 제거
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

# 동기 세션 팩토리
SyncSessionLocal = create_sync_sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False  # ✅ 추가: 커밋해도 엔티티 속성 만료되지 않게
)

# 동기 세션 컨텍스트 매니저 (기존 코드와의 호환성)
from contextlib import contextmanager

@contextmanager
def get_sync_session() -> Session:
    """동기 데이터베이스 세션 컨텍스트 매니저"""
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"데이터베이스 세션 오류: {e}")
        raise
    finally:
        session.close()

# 동기 연결 테스트
def test_sync_connection() -> bool:
    """동기 데이터베이스 연결을 테스트합니다."""
    try:
        with sync_engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
        logger.info("✅ 동기 데이터베이스 연결 테스트 성공")
        return True
    except Exception as e:
        logger.error(f"❌ 동기 데이터베이스 연결 테스트 실패: {e}")
        return False

# 동기 테이블 생성
def create_sync_tables():
    """동기 방식으로 설문 관련 테이블을 생성합니다."""
    try:
        from app.domain.survey.entity import Base
        Base.metadata.create_all(bind=sync_engine)
        logger.info("✅ 설문 관련 테이블 생성 완료 (동기)")
        return True
    except Exception as e:
        logger.error(f"❌ 테이블 생성 실패 (동기): {e}")
        return False

# 동기 테이블 삭제
def drop_sync_tables():
    """동기 방식으로 설문 관련 테이블을 삭제합니다."""
    try:
        from app.domain.survey.entity import Base
        Base.metadata.drop_all(bind=sync_engine)
        logger.info("✅ 설문 관련 테이블 삭제 완료 (동기)")
        return True
    except Exception as e:
        logger.error(f"❌ 테이블 삭제 실패 (동기): {e}")
        return False

# 기존 코드와의 호환성을 위한 클래스 래퍼
class SurveyDatabase:
    """설문 데이터베이스 연결 관리 클래스 (기존 코드와의 호환성)"""
    
    def __init__(self):
        self.engine = sync_engine
        self.SessionLocal = SyncSessionLocal
    
    @contextmanager
    def get_session(self) -> Session:
        """데이터베이스 세션 컨텍스트 매니저"""
        with get_sync_session() as session:
            yield session
    
    def test_connection(self) -> bool:
        """데이터베이스 연결 테스트"""
        return test_sync_connection()
    
    def create_tables(self):
        """테이블 생성"""
        return create_sync_tables()
    
    def drop_tables(self):
        """테이블 삭제"""
        return drop_sync_tables()

# 전역 데이터베이스 인스턴스 (기존 코드와의 호환성)
survey_db = SurveyDatabase()
