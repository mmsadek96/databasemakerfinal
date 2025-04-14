import pandas as pd
from typing import List, Dict, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.utils.data_processing import apply_date_filter
from server.config import get_logger
from cachetools import TTLCache
from server.config import get_settings

logger = get_logger(__name__)


class IndicatorsService:
    """Service for economic indicators operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()
        # Cache with time-to-live (TTL) in seconds
        self.cache = TTLCache(maxsize=100, ttl=self.settings.CACHE_TTL)

    async def get_indicator_data(self, indicator_name: str, start_date: Optional[str] = None,
                                 end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get economic indicator data"""
        cache_key = f"indicator_{indicator_name}_{start_date}_{end_date}"

        if cache_key in self.cache:
            return self.cache[cache_key]

        if indicator_name not in self.client.macro_functions:
            raise ValueError(f"Unknown indicator: {indicator_name}")

        try:
            df = await self.client.get_economic_data(indicator_name)

            if df.empty:
                raise ValueError(f"No data found for indicator: {indicator_name}")

            # Apply date filtering
            if start_date or end_date:
                df = apply_date_filter(df, start_date, end_date)

            # Convert to dictionary for JSON response
            df.index = df.index.strftime('%Y-%m-%d')  # Convert dates to strings
            result = df.reset_index().to_dict(orient='records')

            self.cache[cache_key] = result
            return result
        except Exception as e:
            logger.error(f"Error getting indicator data for {indicator_name}: {e}")
            raise ValueError(f"Failed to get indicator data: {str(e)}")

    async def get_available_indicators(self) -> Dict[str, Any]:
        """Get list of available economic indicators"""
        return {
            "indicators": list(self.client.macro_functions.keys()),
            "intervals": self.client.indicator_intervals,
            "maturities": self.client.indicator_maturity
        }