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
            'outputsize': 'full',
            'entitlement': 'realtime'
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

    async def get_time_series_intraday(self, symbol: str, interval: str = '1min',
                                       outputsize: str = 'full') -> pd.DataFrame:
        """
        Get intraday time series data for a symbol

        Args:
            symbol: The stock symbol
            interval: Time interval between data points (1min, 5min, 15min, 30min, 60min)
            outputsize: 'compact' for latest 100 data points, 'full' for trailing 30 days

        Returns:
            DataFrame with intraday price data
        """
        params = {
            'function': 'TIME_SERIES_INTRADAY',
            'symbol': symbol,
            'interval': interval,
            'outputsize': outputsize,
            'adjusted': 'true',
            'extended_hours': 'true'
        }

        data = await self._make_request(params)

        # Check if we have valid data
        time_series_key = f"Time Series ({interval})"
        if time_series_key not in data:
            logger.warning(f"No intraday data returned for {symbol}")
            return pd.DataFrame()

        # Convert to DataFrame
        ts = data.get(time_series_key, {})
        df = pd.DataFrame(ts).transpose()

        # Rename columns to be more usable - intraday data has different column names
        # Original column names: '1. open', '2. high', '3. low', '4. close', '5. volume'
        df.columns = [
            'open', 'high', 'low', 'close', 'volume'
        ]

        # Convert data types
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Convert index to datetime
        df.index = pd.to_datetime(df.index)
        df.sort_index(inplace=True)

        # Add placeholder columns to match the interface of the daily adjusted function
        df['adjusted_close'] = df['close']  # Since we requested adjusted=true
        df['dividend_amount'] = 0.0
        df['split_coefficient'] = 1.0

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
        # Set up the request parameters
        params = {
            'function': 'REALTIME_OPTIONS',
            'symbol': symbol
        }

        # Add the require_greeks parameter if needed
        if require_greeks:
            params['require_greeks'] = 'true'

        try:
            # Make the API request
            data = await self._make_request(params)

            # Check if the response contains a data array
            if isinstance(data, dict) and 'data' in data and isinstance(data['data'], list):
                # Map the Alpha Vantage response keys to our expected format
                mapped_options = []
                for option in data['data']:
                    # Map fields to match your application's expected model
                    mapped_option = {
                        'contract_name': option.get('contractID', ''),
                        'contract_type': option.get('type', ''),  # 'call' or 'put'
                        'expiration_date': option.get('expiration', ''),
                        'strike_price': float(option.get('strike', 0)),
                        'last_price': float(option.get('last', 0)),
                        'bid': float(option.get('bid', 0)),
                        'ask': float(option.get('ask', 0)),
                        'change': 0.0,  # Not provided by Alpha Vantage, set a default
                        'change_percentage': 0.0,  # Not provided by Alpha Vantage, set a default
                        'volume': int(option.get('volume', 0)),
                        'open_interest': int(option.get('open_interest', 0)),
                    }

                    # Add Greeks if they exist and are requested
                    if require_greeks and 'implied_volatility' in option:
                        mapped_option.update({
                            'implied_volatility': float(option.get('implied_volatility', 0)),
                            'delta': float(option.get('delta', 0)),
                            'gamma': float(option.get('gamma', 0)),
                            'theta': float(option.get('theta', 0)),
                            'vega': float(option.get('vega', 0)),
                        })

                    mapped_options.append(mapped_option)

                return mapped_options

            # Check if there's a message about premium endpoint
            if isinstance(data, dict) and 'message' in data and 'premium' in data['message'].lower():
                logger.warning("The REALTIME_OPTIONS endpoint requires a premium subscription to Alpha Vantage.")
                return []

            logger.warning(
                f"Unexpected response format for options data: {data.keys() if isinstance(data, dict) else type(data)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching options data from Alpha Vantage: {str(e)}")
            return []

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

    # Add this method to the AlphaVantageClient class in server/services/alpha_vantage.py

    async def get_technical_indicator(self,
                                      symbol: str,
                                      indicator: str,
                                      time_period: int = 14,
                                      series_type: str = "close",
                                      interval: str = "daily") -> pd.DataFrame:
        """
        Get technical indicator data for a symbol

        Args:
            symbol: Stock symbol
            indicator: Technical indicator (SMA, EMA, RSI, etc.)
            time_period: Number of data points used to calculate the indicator
            series_type: Price series to use (open, high, low, close)
            interval: Time interval between data points (daily, weekly, monthly)

        Returns:
            DataFrame with indicator data
        """
        # Map interval values to Alpha Vantage format
        interval_map = {
            "daily": "daily",
            "weekly": "weekly",
            "monthly": "monthly",
            "1min": "1min",
            "5min": "5min",
            "15min": "15min",
            "30min": "30min",
            "60min": "60min"
        }

        av_interval = interval_map.get(interval, "daily")

        # Set up request parameters
        params = {
            'function': f"TECHNICAL_INDICATORS::{indicator}",  # Using :: to denote technical indicator
            'symbol': symbol,
            'interval': av_interval,
            'time_period': time_period,
            'series_type': series_type
        }

        # Special handling for certain indicators
        if indicator in ["MACD", "MACDEXT", "STOCH", "STOCHF", "BBANDS"]:
            # These indicators have different parameters
            if indicator == "MACD" or indicator == "MACDEXT":
                params['fastperiod'] = 12
                params['slowperiod'] = 26
                params['signalperiod'] = 9
            elif indicator.startswith("STOCH"):
                params['fastkperiod'] = 5
                params['slowkperiod'] = 3
                params['slowdperiod'] = 3
            elif indicator == "BBANDS":
                params['nbdevup'] = 2
                params['nbdevdn'] = 2
                params['matype'] = 0  # Simple Moving Average

        # Prepare the actual Alpha Vantage function name
        if interval in ["1min", "5min", "15min", "30min", "60min"]:
            # For intraday data, use the intraday version if available
            if indicator in ["SMA", "EMA", "RSI", "MACD", "BBANDS"]:
                params['function'] = f"TECHNICAL_INDICATORS::INTRADAY::{indicator}"

        # Actual function mapping for Alpha Vantage
        function_map = {
            "TECHNICAL_INDICATORS::SMA": "SMA",
            "TECHNICAL_INDICATORS::EMA": "EMA",
            "TECHNICAL_INDICATORS::WMA": "WMA",
            "TECHNICAL_INDICATORS::DEMA": "DEMA",
            "TECHNICAL_INDICATORS::TEMA": "TEMA",
            "TECHNICAL_INDICATORS::TRIMA": "TRIMA",
            "TECHNICAL_INDICATORS::KAMA": "KAMA",
            "TECHNICAL_INDICATORS::MAMA": "MAMA",
            "TECHNICAL_INDICATORS::T3": "T3",
            "TECHNICAL_INDICATORS::MACD": "MACD",
            "TECHNICAL_INDICATORS::MACDEXT": "MACDEXT",
            "TECHNICAL_INDICATORS::STOCH": "STOCH",
            "TECHNICAL_INDICATORS::STOCHF": "STOCHF",
            "TECHNICAL_INDICATORS::RSI": "RSI",
            "TECHNICAL_INDICATORS::STOCHRSI": "STOCHRSI",
            "TECHNICAL_INDICATORS::WILLR": "WILLR",
            "TECHNICAL_INDICATORS::ADX": "ADX",
            "TECHNICAL_INDICATORS::ADXR": "ADXR",
            "TECHNICAL_INDICATORS::APO": "APO",
            "TECHNICAL_INDICATORS::PPO": "PPO",
            "TECHNICAL_INDICATORS::MOM": "MOM",
            "TECHNICAL_INDICATORS::BOP": "BOP",
            "TECHNICAL_INDICATORS::CCI": "CCI",
            "TECHNICAL_INDICATORS::CMO": "CMO",
            "TECHNICAL_INDICATORS::ROC": "ROC",
            "TECHNICAL_INDICATORS::ROCR": "ROCR",
            "TECHNICAL_INDICATORS::AROON": "AROON",
            "TECHNICAL_INDICATORS::AROONOSC": "AROONOSC",
            "TECHNICAL_INDICATORS::MFI": "MFI",
            "TECHNICAL_INDICATORS::TRIX": "TRIX",
            "TECHNICAL_INDICATORS::ULTOSC": "ULTOSC",
            "TECHNICAL_INDICATORS::DX": "DX",
            "TECHNICAL_INDICATORS::MINUS_DI": "MINUS_DI",
            "TECHNICAL_INDICATORS::PLUS_DI": "PLUS_DI",
            "TECHNICAL_INDICATORS::MINUS_DM": "MINUS_DM",
            "TECHNICAL_INDICATORS::PLUS_DM": "PLUS_DM",
            "TECHNICAL_INDICATORS::BBANDS": "BBANDS",
            "TECHNICAL_INDICATORS::MIDPOINT": "MIDPOINT",
            "TECHNICAL_INDICATORS::MIDPRICE": "MIDPRICE",
            "TECHNICAL_INDICATORS::SAR": "SAR",
            "TECHNICAL_INDICATORS::TRANGE": "TRANGE",
            "TECHNICAL_INDICATORS::ATR": "ATR",
            "TECHNICAL_INDICATORS::NATR": "NATR",
            "TECHNICAL_INDICATORS::AD": "AD",
            "TECHNICAL_INDICATORS::ADOSC": "ADOSC",
            "TECHNICAL_INDICATORS::OBV": "OBV",
            "TECHNICAL_INDICATORS::HT_TRENDLINE": "HT_TRENDLINE",
            "TECHNICAL_INDICATORS::HT_SINE": "HT_SINE",
            "TECHNICAL_INDICATORS::HT_TRENDMODE": "HT_TRENDMODE",
            "TECHNICAL_INDICATORS::HT_DCPERIOD": "HT_DCPERIOD",
            "TECHNICAL_INDICATORS::HT_DCPHASE": "HT_DCPHASE",
            "TECHNICAL_INDICATORS::HT_PHASOR": "HT_PHASOR",
            # Intraday versions
            "TECHNICAL_INDICATORS::INTRADAY::SMA": "SMA",
            "TECHNICAL_INDICATORS::INTRADAY::EMA": "EMA",
            "TECHNICAL_INDICATORS::INTRADAY::RSI": "RSI",
            "TECHNICAL_INDICATORS::INTRADAY::MACD": "MACD",
            "TECHNICAL_INDICATORS::INTRADAY::BBANDS": "BBANDS"
        }

        # Get the actual Alpha Vantage function name
        params['function'] = function_map.get(params['function'], indicator)

        try:
            data = await self._make_request(params)

            # Handle different response formats based on the indicator
            indicator_data = None
            for key in data.keys():
                if key.startswith('Technical Analysis:'):
                    indicator_data = data[key]
                    break

            if not indicator_data:
                logger.warning(f"No indicator data found for {indicator} ({symbol})")
                return pd.DataFrame()

            # Convert to DataFrame
            df = pd.DataFrame.from_dict(indicator_data, orient='index')

            # Convert columns to numeric
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

            # Set index as datetime
            df.index = pd.to_datetime(df.index)
            df.sort_index(inplace=True)

            return df

        except Exception as e:
            logger.error(f"Error fetching technical indicator ({indicator}) for {symbol}: {e}")
            return pd.DataFrame()