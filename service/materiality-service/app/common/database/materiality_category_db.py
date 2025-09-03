"""
Materiality Service Database Configuration for Materiality Category Table
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

logger = logging.getLogger("materiality_service_materiality_category_db")

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

# 핵심 함수: 모든 중대성 카테고리 조회
async def get_all_materiality_categories():
    """모든 중대성 카테고리를 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT mc.id, mc.category_name, mc.esg_classification_id,
                           ec.classification_name, ec.classification_type
                    FROM materiality_category mc
                    LEFT JOIN esg_classification ec ON mc.esg_classification_id = ec.id
                    ORDER BY mc.id
                """)
            )
            
            categories = result.fetchall()
            logger.info(f"✅ 중대성 카테고리 조회 완료: {len(categories)}개 카테고리")
            return categories
            
    except Exception as e:
        logger.error(f"❌ 중대성 카테고리 조회 중 오류: {str(e)}")
        return []