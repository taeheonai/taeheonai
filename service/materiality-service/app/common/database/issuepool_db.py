"""
Materiality Service Database Configuration for Issue Pool Table
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

logger = logging.getLogger("materiality_service_issuepool_db")

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

# 핵심 함수: 모든 이슈풀 조회
async def get_all_issuepools():
    """모든 이슈풀을 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT ip.id, ip.corporation_id, ip.publish_year, ip.ranking,
                           ip.base_issue_pool, ip.issue_pool, ip.category_id, ip.esg_classification_id,
                           c.corporation_name, ec.classification_name, ec.classification_type
                    FROM issuepool ip
                    LEFT JOIN corporation c ON ip.corporation_id = c.id
                    LEFT JOIN esg_classification ec ON ip.esg_classification_id = ec.id
                    ORDER BY ip.corporation_id, ip.publish_year DESC, ip.ranking
                """)
            )
            
            issuepools = result.fetchall()
            logger.info(f"✅ 이슈풀 조회 완료: {len(issuepools)}개 이슈")
            return issuepools
            
    except Exception as e:
        logger.error(f"❌ 이슈풀 조회 중 오류: {str(e)}")
        return []

# 특정 기업의 이슈풀 조회
async def get_issuepools_by_corporation(corporation_id: int, publish_year: int = None):
    """특정 기업의 이슈풀을 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            if publish_year:
                result = await session.execute(
                    text("""
                        SELECT ip.id, ip.corporation_id, ip.publish_year, ip.ranking,
                               ip.base_issue_pool, ip.issue_pool, ip.category_id, ip.esg_classification_id,
                               c.corporation_name, ec.classification_name, ec.classification_type
                        FROM issuepool ip
                        LEFT JOIN corporation c ON ip.corporation_id = c.id
                        LEFT JOIN esg_classification ec ON ip.esg_classification_id = ec.id
                        WHERE ip.corporation_id = :corporation_id AND ip.publish_year = :publish_year
                        ORDER BY ip.ranking
                    """),
                    {"corporation_id": corporation_id, "publish_year": publish_year}
                )
            else:
                result = await session.execute(
                    text("""
                        SELECT ip.id, ip.corporation_id, ip.publish_year, ip.ranking,
                               ip.base_issue_pool, ip.issue_pool, ip.category_id, ip.esg_classification_id,
                               c.corporation_name, ec.classification_name, ec.classification_type
                        FROM issuepool ip
                        LEFT JOIN corporation c ON ip.corporation_id = c.id
                        LEFT JOIN esg_classification ec ON ip.esg_classification_id = ec.id
                        WHERE ip.corporation_id = :corporation_id
                        ORDER BY ip.publish_year DESC, ip.ranking
                    """),
                    {"corporation_id": corporation_id}
                )
            
            issuepools = result.fetchall()
            logger.info(f"✅ 기업 {corporation_id}의 이슈풀 조회 완료: {len(issuepools)}개 이슈")
            return issuepools
            
    except Exception as e:
        logger.error(f"❌ 기업 {corporation_id}의 이슈풀 조회 중 오류: {str(e)}")
        return []

# 특정 연도의 이슈풀 조회
async def get_issuepools_by_year(publish_year: int):
    """특정 연도의 이슈풀을 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT ip.id, ip.corporation_id, ip.publish_year, ip.ranking,
                           ip.base_issue_pool, ip.issue_pool, ip.category_id, ip.esg_classification_id,
                           c.corporation_name, ec.classification_name, ec.classification_type
                    FROM issuepool ip
                    LEFT JOIN corporation c ON ip.corporation_id = c.id
                    LEFT JOIN esg_classification ec ON ip.esg_classification_id = ec.id
                    WHERE ip.publish_year = :publish_year
                    ORDER BY ip.corporation_id, ip.ranking
                """),
                {"publish_year": publish_year}
            )
            
            issuepools = result.fetchall()
            logger.info(f"✅ {publish_year}년 이슈풀 조회 완료: {len(issuepools)}개 이슈")
            return issuepools
            
    except Exception as e:
        logger.error(f"❌ {publish_year}년 이슈풀 조회 중 오류: {str(e)}")
        return []

