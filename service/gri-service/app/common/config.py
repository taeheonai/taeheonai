from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 서비스 설정
    service_name: str = "gri-service"
    version: str = "1.0.0"
    
    # LLM 서비스 설정
    llm_service_url: str = "http://llm-service:8005"
    llm_service_timeout: float = 30.0  # 기본 타임아웃만 설정
    llm_api_key: Optional[str] = None  # LLM 서비스 인증 키
    openai_api_key: Optional[str] = None  # OpenAI API 키 (환경변수: OPENAI_API_KEY)
    openai_model: str = "gpt-3.5-turbo"  # OpenAI 모델 (환경변수: OPENAI_MODEL)
    
    # 데이터베이스 설정
    database_url: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        from_attributes = True  # V2: orm_mode 대체
        # 환경변수 이름 매핑
        fields = {
            "openai_api_key": {"env": "OPENAI_API_KEY"},
            "openai_model": {"env": "OPENAI_MODEL"}
        }

@lru_cache()
def get_settings() -> Settings:
    return Settings()
