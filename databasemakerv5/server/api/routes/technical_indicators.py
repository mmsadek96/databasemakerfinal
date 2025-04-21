# server/api/routes/technical_indicators.py
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Optional, Any
from server.services.technical_indicators_service import TechnicalIndicatorsService
from server.models.response_models import IndicatorDataResponse

router = APIRouter(prefix="/api/technical", tags=["technical_indicators"])


@router.get("/{symbol}/{indicator}", response_model=List[IndicatorDataResponse])
async def get_technical_indicator(
        symbol: str,
        indicator: str,
        time_period: Optional[int] = Query(14, description="Number of data points used to calculate the indicator"),
        series_type: Optional[str] = Query("close", description="The price series to use (open, high, low, close)"),
        interval: Optional[str] = Query("daily", description="Time interval between data points"),
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        technical_indicators_service: TechnicalIndicatorsService = Depends()
):
    """
    Get technical indicator data for a symbol

    Supported indicators:
    - SMA - Simple Moving Average
    - EMA - Exponential Moving Average
    - WMA - Weighted Moving Average
    - DEMA - Double Exponential Moving Average
    - TEMA - Triple Exponential Moving Average
    - TRIMA - Triangular Moving Average
    - KAMA - Kaufman Adaptive Moving Average
    - MACD - Moving Average Convergence/Divergence
    - RSI - Relative Strength Index
    - ADX - Average Directional Movement Index
    - CCI - Commodity Channel Index
    - AROON - Aroon Oscillator
    - BBands - Bollinger Bands
    - AD - Chaikin A/D Line
    - OBV - On Balance Volume
    - STOCH - Stochastic Oscillator
    """
    try:
        indicator_data = await technical_indicators_service.get_indicator_data(
            symbol, indicator, time_period, series_type, interval, start_date, end_date
        )
        return indicator_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/available/list", response_model=Dict[str, Any])
async def get_available_technical_indicators(
        technical_indicators_service: TechnicalIndicatorsService = Depends()
):
    """
    Get list of available technical indicators
    """
    return await technical_indicators_service.get_available_indicators()