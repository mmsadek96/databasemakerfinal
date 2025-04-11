import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.utils.data_processing import apply_date_filter
from server.config import get_logger
from cachetools import TTLCache
from server.config import get_settings

logger = get_logger(__name__)


class CorrelationService:
    """Service for correlation analysis operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()
        # Cache with time-to-live (TTL) in seconds
        self.cache = TTLCache(maxsize=100, ttl=self.settings.CACHE_TTL)

    async def calculate_correlation(self,
                                    stocks: Optional[List[str]] = None,
                                    indicators: Optional[List[str]] = None,
                                    start_date: Optional[str] = None,
                                    end_date: Optional[str] = None) -> Dict[str, Any]:
        """Calculate correlation between stocks and/or indicators"""
        # Create a unique cache key based on inputs
        cache_key = f"corr_{'_'.join(stocks or [])}_{','.join(indicators or [])}_{start_date}_{end_date}"

        if cache_key in self.cache:
            return self.cache[cache_key]

        stocks = stocks or []
        indicators = indicators or []

        if not stocks and not indicators:
            raise ValueError("At least one stock or indicator must be specified")

        try:
            # Build combined dataframe
            dfs = []

            # Get stock data
            for symbol in stocks:
                df = await self.client.get_time_series_daily(symbol)
                if df.empty:
                    continue

                df = apply_date_filter(df, start_date, end_date)
                price_series = df['close'].resample('M').last()  # Monthly data for correlation
                price_series.name = symbol
                dfs.append(price_series)

            # Get indicator data
            for indicator in indicators:
                if indicator not in self.client.macro_functions:
                    continue

                df = await self.client.get_economic_data(indicator)
                if df.empty:
                    continue

                df = apply_date_filter(df, start_date, end_date)
                value_series = df['value'].resample('M').last()  # Monthly data for correlation
                value_series.name = indicator
                dfs.append(value_series)

            # Combine and calculate correlation
            if len(dfs) < 2:
                raise ValueError("Insufficient data for correlation analysis")

            combined_df = pd.concat(dfs, axis=1)
            combined_df.dropna(inplace=True)

            if combined_df.empty or combined_df.shape[1] < 2:
                raise ValueError("No overlapping data available for correlation analysis")

            corr_matrix = combined_df.corr(method='pearson').round(2)

            # Convert correlation matrix to a format suitable for JSON response
            corr_data = {
                "labels": list(corr_matrix.columns),
                "matrix": corr_matrix.values.tolist()
            }

            self.cache[cache_key] = corr_data
            return corr_data
        except Exception as e:
            logger.error(f"Error calculating correlation: {e}")
            raise ValueError(f"Failed to calculate correlation: {str(e)}")