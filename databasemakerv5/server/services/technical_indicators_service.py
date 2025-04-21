# server/services/technical_indicators_service.py
import pandas as pd
from typing import List, Dict, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.utils.data_processing import apply_date_filter
from server.config import get_logger
from server.config import get_settings

logger = get_logger(__name__)


class TechnicalIndicatorsService:
    """Service for technical indicators operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.settings = get_settings()

        # Define available technical indicators
        self.technical_indicators = {
            "SMA": "Simple Moving Average",
            "EMA": "Exponential Moving Average",
            "WMA": "Weighted Moving Average",
            "DEMA": "Double Exponential Moving Average",
            "TEMA": "Triple Exponential Moving Average",
            "TRIMA": "Triangular Moving Average",
            "KAMA": "Kaufman Adaptive Moving Average",
            "MAMA": "MESA Adaptive Moving Average",
            "VWAP": "Volume Weighted Average Price",
            "T3": "Triple Exponential Moving Average 3",
            "MACD": "Moving Average Convergence Divergence",
            "MACDEXT": "MACD with Controllable MA Type",
            "STOCH": "Stochastic Oscillator",
            "STOCHF": "Stochastic Fast",
            "RSI": "Relative Strength Index",
            "STOCHRSI": "Stochastic Relative Strength Index",
            "WILLR": "Williams' %R",
            "ADX": "Average Directional Movement Index",
            "ADXR": "Average Directional Movement Index Rating",
            "APO": "Absolute Price Oscillator",
            "PPO": "Percentage Price Oscillator",
            "MOM": "Momentum",
            "BOP": "Balance Of Power",
            "CCI": "Commodity Channel Index",
            "CMO": "Chande Momentum Oscillator",
            "ROC": "Rate of Change",
            "ROCR": "Rate of Change Ratio",
            "AROON": "Aroon",
            "AROONOSC": "Aroon Oscillator",
            "MFI": "Money Flow Index",
            "TRIX": "1-day Rate-Of-Change of a Triple Smooth EMA",
            "ULTOSC": "Ultimate Oscillator",
            "DX": "Directional Movement Index",
            "MINUS_DI": "Minus Directional Indicator",
            "PLUS_DI": "Plus Directional Indicator",
            "MINUS_DM": "Minus Directional Movement",
            "PLUS_DM": "Plus Directional Movement",
            "BBANDS": "Bollinger Bands",
            "MIDPOINT": "MidPoint over period",
            "MIDPRICE": "Midpoint Price over period",
            "SAR": "Parabolic SAR",
            "TRANGE": "True Range",
            "ATR": "Average True Range",
            "NATR": "Normalized Average True Range",
            "AD": "Chaikin A/D Line",
            "ADOSC": "Chaikin A/D Oscillator",
            "OBV": "On Balance Volume",
            "HT_TRENDLINE": "Hilbert Transform - Instantaneous Trendline",
            "HT_SINE": "Hilbert Transform - SineWave",
            "HT_TRENDMODE": "Hilbert Transform - Trend vs Cycle Mode",
            "HT_DCPERIOD": "Hilbert Transform - Dominant Cycle Period",
            "HT_DCPHASE": "Hilbert Transform - Dominant Cycle Phase",
            "HT_PHASOR": "Hilbert Transform - Phasor Components"
        }

    async def get_indicator_data(self,
                                 symbol: str,
                                 indicator: str,
                                 time_period: int = 14,
                                 series_type: str = "close",
                                 interval: str = "daily",
                                 start_date: Optional[str] = None,
                                 end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get technical indicator data for a symbol"""
        indicator = indicator.upper()

        if indicator not in self.technical_indicators:
            raise ValueError(f"Unknown indicator: {indicator}")

        try:
            # Use the Alpha Vantage client to fetch technical indicator data
            data = await self.client.get_technical_indicator(symbol, indicator, time_period, series_type, interval)

            if not data or data.empty:
                raise ValueError(f"No {indicator} data found for symbol: {symbol}")

            # Apply date filtering if specified
            if start_date or end_date:
                data = apply_date_filter(data, start_date, end_date)

            # Convert to dictionary for JSON response
            data.index = data.index.strftime('%Y-%m-%d')  # Convert dates to strings
            result = data.reset_index().to_dict(orient='records')

            return result
        except Exception as e:
            logger.error(f"Error getting {indicator} data for {symbol}: {e}")
            raise ValueError(f"Failed to get indicator data: {str(e)}")

    async def get_available_indicators(self) -> Dict[str, Any]:
        """Get list of available technical indicators"""
        return {
            "indicators": self.technical_indicators
        }