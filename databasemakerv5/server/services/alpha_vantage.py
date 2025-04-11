import requests
import pandas as pd
from typing import Dict, List, Optional, Any
import datetime
import aiohttp
from server.config import get_settings, get_logger

logger = get_logger(__name__)


class AlphaVantageClient:
    """Client for interacting with Alpha Vantage API"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.ALPHA_VANTAGE_API_KEY
        self.base_url = 'https://www.alphavantage.co/query'

        # Define available macro functions
        self.macro_functions = {
            'Real GDP': 'REAL_GDP',
            'Real GDP per Capita': 'REAL_GDP_PER_CAPITA',
            'Treasury Yield': 'TREASURY_YIELD',
            'Federal Funds Rate': 'FEDERAL_FUNDS_RATE',
            'CPI': 'CPI',
            'Inflation': 'INFLATION',
            'Retail Sales': 'RETAIL_SALES',
            'Durables': 'DURABLES',
            'Unemployment': 'UNEMPLOYMENT',
            'Nonfarm Payroll': 'NONFARM_PAYROLL'
        }

        self.indicator_intervals = {
            'Real GDP': 'quarterly',
            'Real GDP per Capita': 'annual',
            'Treasury Yield': 'monthly',
            'Federal Funds Rate': 'monthly',
            'CPI': 'monthly',
            'Inflation': 'monthly',
            'Retail Sales': 'monthly',
            'Durables': 'monthly',
            'Unemployment': 'monthly',
            'Nonfarm Payroll': 'monthly'
        }

        self.indicator_maturity = {
            'Treasury Yield': '10year'
        }

    async def _make_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to Alpha Vantage API"""
        params['apikey'] = self.api_key

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"API request failed: {response.status}")
                        raise ValueError(f"API request failed with status {response.status}")

                    data = await response.json()

                    # Check for error messages
                    if 'Error Message' in data:
                        logger.error(f"API error: {data['Error Message']}")
                        raise ValueError(data['Error Message'])

                    if 'Information' in data:
                        logger.warning(f"API info: {data['Information']}")

                    return data
        except aiohttp.ClientError as e:
            logger.error(f"Request error: {str(e)}")
            raise ValueError(f"Failed to connect to Alpha Vantage API: {str(e)}")

    async def search_symbols(self, keywords: str) -> List[Dict[str, str]]:
        """Search for stock symbols"""
        params = {
            'function': 'SYMBOL_SEARCH',
            'keywords': keywords
        }

        data = await self._make_request(params)
        return data.get('bestMatches', [])

    async def get_time_series_daily(self, symbol: str) -> pd.DataFrame:
        """Get daily time series data for a symbol"""
        params = {
            'function': 'TIME_SERIES_DAILY_ADJUSTED',
            'symbol': symbol,
            'outputsize': 'full'
        }

        data = await self._make_request(params)

        # Check if we have valid data
        if 'Time Series (Daily)' not in data:
            logger.warning(f"No data returned for {symbol}")
            return pd.DataFrame()

        # Convert to DataFrame
        ts = data.get('Time Series (Daily)', {})
        df = pd.DataFrame(ts).transpose()

        # Rename columns to be more usable
        df.columns = [
            'open', 'high', 'low', 'close', 'adjusted_close',
            'volume', 'dividend_amount', 'split_coefficient'
        ]

        # Convert data types
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Convert index to datetime
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)

        return df

    async def get_economic_data(self, indicator_name: str) -> pd.DataFrame:
        """Get economic indicator data"""
        if indicator_name not in self.macro_functions:
            logger.warning(f"Unknown indicator: {indicator_name}")
            return pd.DataFrame()

        fn = self.macro_functions[indicator_name]
        interval = self.indicator_intervals.get(indicator_name, '')
        maturity = self.indicator_maturity.get(indicator_name, '')

        params = {
            'function': fn,
            'interval': interval
        }

        if maturity:
            params['maturity'] = maturity

        data = await self._make_request(params)

        if 'data' not in data:
            logger.warning(f"No data returned for {indicator_name}")
            return pd.DataFrame()

        df = pd.DataFrame(data['data'])

        if 'date' not in df.columns or 'value' not in df.columns:
            logger.warning(f"Unexpected data format for {indicator_name}")
            return pd.DataFrame()

        # Convert data types
        df['date'] = pd.to_datetime(df['date'])
        df['value'] = pd.to_numeric(df['value'], errors='coerce')

        # Remove missing values and set index
        df.dropna(subset=['value'], inplace=True)
        df.set_index('date', inplace=True)
        df.sort_index(inplace=True)

        return df

    async def get_options_data(self, symbol: str, require_greeks: bool = False) -> List[Dict[str, Any]]:
        """Get options data for a symbol"""
        params = {
            'function': 'REALTIME_OPTIONS',
            'symbol': symbol,
            'entitlement': 'realtime'
        }

        if require_greeks:
            params['require_greeks'] = 'true'

        data = await self._make_request(params)

        if 'options' not in data:
            logger.warning(f"No options data found for {symbol}")
            return []

        return data.get('options', [])

    async def get_market_movers(self) -> Dict[str, Any]:
        """Get market movers (gainers, losers, most active)"""
        params = {
            'function': 'TOP_GAINERS_LOSERS'
        }

        data = await self._make_request(params)

        # Check if we have valid data
        if not any(k in data for k in ['top_gainers', 'top_losers', 'most_actively_traded']):
            logger.warning("No market movers data found")
            return {
                "timestamp": datetime.datetime.now().isoformat(),
                "gainers": [],
                "losers": [],
                "active": []
            }

        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "gainers": data.get("top_gainers", []),
            "losers": data.get("top_losers", []),
            "active": data.get("most_actively_traded", [])
        }

    async def get_earnings_transcript(self, symbol: str, quarter: str) -> Dict[str, Any]:
        """Get earnings call transcript"""
        params = {
            'function': 'EARNINGS_CALL_TRANSCRIPT',
            'symbol': symbol,
            'quarter': quarter
        }

        try:
            data = await self._make_request(params)

            # Check if transcript data is present
            if 'transcript' not in data or not data.get('transcript'):
                logger.info(f"No transcript found for {symbol} {quarter}")
                return {}

            # Format the transcript data
            formatted_transcript = {
                'quarter': quarter,
                'date': data.get('call_date', ''),
                'transcript': []
            }

            # Process each part of the transcript
            for entry in data.get('transcript', []):
                formatted_transcript['transcript'].append({
                    'speaker': entry.get('speaker', 'Unknown'),
                    'title': entry.get('title', ''),
                    'content': entry.get('content', ''),
                    'sentiment': entry.get('sentiment', 0)
                })

            return formatted_transcript
        except Exception as e:
            logger.error(f"Error fetching transcript for {symbol} {quarter}: {e}")
            return {}

    async def get_financial_data(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive financial data"""
        endpoints = [
            ('OVERVIEW', 'company_overview'),
            ('INCOME_STATEMENT', 'income_statement'),
            ('BALANCE_SHEET', 'balance_sheet'),
            ('CASH_FLOW', 'cash_flow'),
            ('INSIDER_TRANSACTIONS', 'insider_transactions')
        ]

        result = {"symbol": symbol}

        for function, key in endpoints:
            params = {
                'function': function,
                'symbol': symbol
            }

            try:
                data = await self._make_request(params)
                result[key] = data
            except Exception as e:
                logger.error(f"Error fetching {function} for {symbol}: {e}")
                result[key] = {}

        return result