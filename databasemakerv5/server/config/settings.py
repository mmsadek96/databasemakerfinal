# server/config/settings.py
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Server settings
    PORT: int = Field(8000, env="PORT")

    # API Keys
    ALPHA_VANTAGE_API_KEY: str = Field(..., env="ALPHA_VANTAGE_API_KEY")
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")

    # Cache settings
    CACHE_TTL: int = Field(300, env="CACHE_TTL")  # 5 minutes default

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()