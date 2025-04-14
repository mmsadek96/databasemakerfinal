# Update in server/services/stock_service.py
import pandas as pd
from typing import List, Dict, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.utils.data_processing import apply_date_filter
from server.config import get_logger
import asyncio
from cachetools import TTLCache
from server.config import get_settings
from datetime import datetime, timedelta

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
            # Set default date range if not provided or invalid
            today = datetime.now()

            # Default end_date to yesterday (to ensure all data exists)
            default_end_date = (today - timedelta(days=1)).strftime('%Y-%m-%d')

            # Default start_date to 1 year ago from end_date
            default_start_date = (today - timedelta(days=366)).strftime('%Y-%m-%d')

            # Validate and set dates
            if not end_date or end_date > today.strftime('%Y-%m-%d'):
                end_date = default_end_date

            if not start_date or start_date > end_date:
                start_date = default_start_date

            logger.info(f"Getting stock data for {symbol} from {start_date} to {end_date}")

            df = await self.client.get_time_series_daily(symbol)

            if df.empty:
                raise ValueError(f"No data found for symbol: {symbol}")

            # Apply date filtering
            df = apply_date_filter(df, start_date, end_date)

            if df.empty:
                raise ValueError(f"No data available for the selected date range")

            # Convert to dictionary for JSON response
            df.reset_index(inplace=True)
            df.rename(columns={'index': 'date'}, inplace=True)
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')  # Format dates as strings
            result = df.to_dict(orient='records')

            self.cache[cache_key] = result
            return result
        except Exception as e:
            logger.error(f"Error getting stock data for {symbol}: {e}")
            raise ValueError(f"Failed to get stock data: {str(e)}")