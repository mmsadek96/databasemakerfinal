from typing import List, Dict, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.config import get_logger
from cachetools import TTLCache
from server.config import get_settings

logger = get_logger(__name__)


class OptionsService:
    """Service for options data operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()
        # Cache with time-to-live (TTL) in seconds - shorter for options data
        self.cache = TTLCache(maxsize=100, ttl=300)  # 5 minutes

    async def get_options_data(self, symbol: str, require_greeks: bool = False) -> List[Dict[str, Any]]:
        """Get options chain data for a given symbol"""
        cache_key = f"options_{symbol}_{require_greeks}"

        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            options_data = await self.client.get_options_data(symbol, require_greeks)

            if not options_data:
                raise ValueError(f"No options data found for symbol: {symbol}")

            self.cache[cache_key] = options_data
            return options_data
        except Exception as e:
            logger.error(f"Error getting options data for {symbol}: {e}")
            raise ValueError(f"Failed to get options data: {str(e)}")