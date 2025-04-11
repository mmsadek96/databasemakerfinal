from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class StockDataResponse(BaseModel):
    """Response model for stock data"""
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: int
    dividend_amount: float
    split_coefficient: float

class IndicatorDataResponse(BaseModel):
    """Response model for indicator data"""
    date: str
    value: float

class OptionsContractResponse(BaseModel):
    """Response model for options contract"""
    contract_name: str
    contract_type: str
    expiration_date: str
    strike_price: float
    last_price: float
    bid: float
    ask: float
    change: float
    change_percentage: float
    volume: int
    open_interest: int
    implied_volatility: Optional[float] = None
    delta: Optional[float] = None
    gamma: Optional[float] = None
    theta: Optional[float] = None
    vega: Optional[float] = None

class MarketMoversResponse(BaseModel):
    """Response model for market movers"""
    timestamp: str
    gainers: List[Dict[str, Any]]
    losers: List[Dict[str, Any]]
    active: List[Dict[str, Any]]

class CorrelationResponse(BaseModel):
    """Response model for correlation analysis"""
    labels: List[str]
    matrix: List[List[float]]

class TranscriptAnalysisResponse(BaseModel):
    """Response model for transcript analysis"""
    symbol: str
    quarter: str
    transcript: Dict[str, Any]
    primary_analysis: str
    additional_quarters_analyzed: List[str] = []
    comparative_analysis: Optional[str] = None
    financial_data: Optional[Dict[str, Any]] = None
    includes_financial_context: Optional[bool] = False
    original_analysis: Optional[str] = None