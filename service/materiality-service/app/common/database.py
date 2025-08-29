import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# 예: postgresql+psycopg2://USER:PASS@HOST:PORT/DB
DATABASE_URL = os.getenv("DATABASE_URL")

# DB 엔진 & 세션팩토리
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)

# Declarative Base (엔티티들이 import 해서 사용)
Base = declarative_base()

# FastAPI Depends에서 쓰는 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
