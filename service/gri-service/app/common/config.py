from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, HttpUrl

class Settings(BaseSettings):
    # 서비스 설정
    service_name: str = "gri-service"
    environment: str = "production"
    
    # 데이터베이스 설정
    database_url: str | None = Field(None, alias="DATABASE_URL")
    
    # LLM 서비스 설정
    llm_service_url: HttpUrl = Field(..., alias="LLM_SERVICE_URL")
    llm_service_timeout: float = Field(30.0, alias="LLM_SERVICE_TIMEOUT")
    service_api_key: str = Field("default-service-key", alias="SERVICE_API_KEY")
    
    # CORS 설정
    cors_url: str | None = Field(None, alias="CORS_URL")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()