from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

# 환경 변수에서 데이터베이스 URL 가져오기
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.warning("⚠️ DATABASE_URL 환경변수가 설정되지 않았습니다. 로컬 개발용 더미 URL로 대체합니다.")
    logger.warning("⚠️ 서비스는 시작되지만 데이터베이스 연결은 불가능합니다.")
    DATABASE_URL = "postgresql+asyncpg://dev:dev@localhost:5432/dev"

# postgres:// / postgresql:// -> postgresql+asyncpg:// 변환 (create_async_engine은 async 드라이버가 필요함)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# 비동기 엔진 생성
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # 개발 환경에서 SQL 로그 출력
    pool_pre_ping=True,
    pool_recycle=300
)

# 비동기 세션 팩토리 생성
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base 클래스 생성
Base = declarative_base()

# 비동기 데이터베이스 세션 의존성
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 데이터베이스 초기화
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)