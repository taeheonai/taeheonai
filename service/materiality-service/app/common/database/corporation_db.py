#search medai
#corporation_DB

"""
Materiality Service Database Configuration for Corporation Table
"""
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text

logger = logging.getLogger("materiality_service_corporation_db")

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

# Corporation 테이블 관련 함수들
async def get_corporation_info(company_id: str = None):
    """기업 정보를 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            if company_id:
                # 특정 기업 정보 조회
                result = await session.execute(
                    text("SELECT * FROM corporation WHERE companyname = :company_id OR corp_code = :company_id"),
                    {"company_id": company_id}
                )
            else:
                # 모든 기업 정보 조회
                result = await session.execute(text("SELECT * FROM corporation"))
            
            corporations = result.fetchall()
            logger.info(f"✅ 기업 정보 조회 완료: {len(corporations)}개 기업")
            return corporations
            
    except Exception as e:
        logger.error(f"❌ 기업 정보 조회 중 오류: {str(e)}")
        return []

async def search_corporation_by_period(start_date: str, end_date: str, company_id: str = None):
    """특정 기간의 기업 정보를 검색합니다."""
    try:
        async with AsyncSessionLocal() as session:
            query = """
                SELECT c.*, f.*, e.*, pl.*
                FROM corporation c
                LEFT JOIN finance f ON c.id = f.company_id
                LEFT JOIN employee e ON c.id = e.corp_code
                LEFT JOIN profit_loss pl ON c.id = pl.company_id
                WHERE 1=1
            """
            params = {}
            
            if company_id:
                query += " AND (c.companyname = :company_id OR c.corp_code = :company_id)"
                params["company_id"] = company_id
            
            if start_date and end_date:
                query += " AND (f.year BETWEEN :start_date AND :end_date OR e.year BETWEEN :start_date AND :end_date)"
                params["start_date"] = start_date
                params["end_date"] = end_date
            
            result = await session.execute(text(query), params)
            search_results = result.fetchall()
            
            logger.info(f"✅ 기간별 기업 정보 검색 완료: {len(search_results)}개 결과")
            return search_results
            
    except Exception as e:
        logger.error(f"❌ 기간별 기업 정보 검색 중 오류: {str(e)}")
        return []

async def get_corporation_statistics():
    """기업 통계 정보를 조회합니다."""
    try:
        async with AsyncSessionLocal() as session:
            # 전체 기업 수
            total_result = await session.execute(text("SELECT COUNT(*) FROM corporation"))
            total_corporations = total_result.scalar()
            
            # 시장별 기업 수
            market_result = await session.execute(
                text("SELECT market, COUNT(*) FROM corporation GROUP BY market")
            )
            market_stats = market_result.fetchall()
            
            # 최근 업데이트된 기업 수
            recent_result = await session.execute(
                text("SELECT COUNT(*) FROM corporation WHERE updated_at >= NOW() - INTERVAL '30 days'")
            )
            recent_corporations = recent_result.scalar()
            
            stats = {
                "total_corporations": total_corporations,
                "market_distribution": dict(market_stats),
                "recent_updates": recent_corporations
            }
            
            logger.info(f"✅ 기업 통계 정보 조회 완료: 총 {total_corporations}개 기업")
            return stats
            
    except Exception as e:
        logger.error(f"❌ 기업 통계 정보 조회 중 오류: {str(e)}")
        return {}

async def create_tables():
    """필요한 테이블들이 존재하는지 확인하고, 없다면 생성합니다."""
    try:
        async with engine.begin() as conn:
            # corporation 테이블 존재 여부 확인
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'corporation'
                );
            """))
            table_exists = result.scalar()

            if not table_exists:
                logger.warning("⚠️ corporation 테이블이 존재하지 않습니다. 수동으로 생성해주세요.")
                return False
            else:
                # 기존 데이터 개수 확인
                count_result = await conn.execute(text("SELECT COUNT(*) FROM corporation"))
                corp_count = count_result.scalar()
                logger.info(f"ℹ️ corporation 테이블이 이미 존재합니다. (기존 기업: {corp_count}개)")
                return True
                
    except Exception as e:
        logger.error(f"❌ 테이블 확인 중 오류: {str(e)}")
        return False

# 미디어 검색 관련 함수
async def search_media_articles(company_id: str, start_date: str, end_date: str):
    """특정 기업의 미디어 기사를 검색합니다."""
    try:
        async with AsyncSessionLocal() as session:
            # TODO: 실제 미디어 기사 테이블이 있다면 여기서 검색
            # 현재는 corporation 테이블의 기본 정보만 반환
            
            result = await session.execute(
                text("""
                    SELECT c.companyname, c.corp_code, c.market, c.dart_code
                    FROM corporation c
                    WHERE c.companyname = :company_id OR c.corp_code = :company_id
                """),
                {"company_id": company_id}
            )
            
            company_info = result.fetchone()
            if company_info:
                logger.info(f"✅ 기업 정보 조회 완료: {company_info.companyname}")
                return {
                    "company_info": company_info,
                    "search_period": {"start_date": start_date, "end_date": end_date},
                    "articles": [],  # TODO: 실제 미디어 기사 데이터
                    "total_results": 0
                }
            else:
                logger.warning(f"⚠️ 기업을 찾을 수 없습니다: {company_id}")
                return None
                
    except Exception as e:
        logger.error(f"❌ 미디어 기사 검색 중 오류: {str(e)}")
        return None