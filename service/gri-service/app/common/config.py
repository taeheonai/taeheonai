from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 서비스 설정
    service_name: str
    version: str
    
    # LLM 서비스 설정
    llm_service_url: str
    llm_service_timeout: float = 30.0  # 기본 타임아웃만 설정
    
    # 데이터베이스 설정
    database_url: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        from_attributes = True  # V2: orm_mode 대체

@lru_cache()
def get_settings() -> Settings:
    return Settings()
