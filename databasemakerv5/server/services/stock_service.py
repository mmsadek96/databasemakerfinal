import pandas as pd
from typing import List, Dict, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.utils.data_processing import apply_date_filter
from server.config import get_logger
import asyncio
from cachetools import TTLCache
from server.config import get_settings

logger = get_logger(__name__)


class StockService:
    """Service for stock-related operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()
        # Cache with time-to-live (TTL) in seconds
        self.cache = TTLCache(maxsize=1000, ttl=self.settings.CACHE_TTL)

    async def search_symbols(self, keywords: str) -> List[Dict[str, str]]:
        """Search for stock symbols"""
        cache_key = f"search_{keywords}"

        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            results = await self.client.search_symbols(keywords)
            self.cache[cache_key] = results
            return results
        except Exception as e:
            logger.error(f"Error searching symbols: {e}")
            raise ValueError(f"Failed to search symbols: {str(e)}")

    async def get_stock_data(self, symbol: str, start_date: Optional[str] = None,
                             end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get stock price data for a given symbol"""
        cache_key = f"stock_{symbol}_{start_date}_{end_date}"

        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            df = await self.client.get_time_series_daily(symbol)

            if df.empty:
                raise ValueError(f"No data found for symbol: {symbol}")

            # Apply date filtering
            if start_date or end_date:
                df = apply_date_filter(df, start_date, end_date)

            # Convert to dictionary for JSON response
            df.index = df.index.strftime('%Y-%m-%d')  # Convert dates to strings
            result = df.reset_index().to_dict(orient='records')

            self.cache[cache_key] = result
            return result
        except Exception as e:
            logger.error(f"Error getting stock data for {symbol}: {e}")
            raise ValueError(f"Failed to get stock data: {str(e)}")