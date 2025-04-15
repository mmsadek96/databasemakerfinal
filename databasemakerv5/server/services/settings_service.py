from typing import Dict, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.config import get_settings, get_logger

logger = get_logger(__name__)


class SettingsService:
    """Service for application settings operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()
        self.current_api_key = self.settings.ALPHA_VANTAGE_API_KEY

    async def get_api_key(self) -> str:
        """Get the current API key"""
        return self.current_api_key

    async def update_api_key(self, api_key: str) -> None:
        """Update the API key"""
        self.current_api_key = api_key
        self.client.api_key = api_key

    async def get_market_movers(self) -> Dict[str, Any]:
        """Get market movers data"""
        try:
            return await self.client.get_market_movers()
        except Exception as e:
            logger.error(f"Error getting market movers: {e}")
            raise ValueError(f"Failed to get market movers: {str(e)}")