# server/config/settings.py
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
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
    MONGODB_PASSWORD: str = Field(..., env="MONGODB_PASSWORD")

    # IBKR API Settings
    IBKR_API_KEY: str = Field("", env="IBKR_API_KEY")
    IBKR_API_URL: str = Field("https://api.ibkr.com/v1/api", env="IBKR_API_URL")
    IBKR_ACCOUNT_ID: str = Field("", env="IBKR_ACCOUNT_ID")

    # TWS Socket API settings
    TWS_HOST: str = Field("127.0.0.1", env="TWS_HOST")
    TWS_PORT: int = Field(7496, env="TWS_PORT")
    TWS_CLIENT_ID: int = Field(1, env="TWS_CLIENT_ID")

    class Config:
        env_file = ".env"
        case_sensitive = True



@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()