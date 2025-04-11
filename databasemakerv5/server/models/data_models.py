from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SymbolSearchResult(BaseModel):
    """Model for symbol search results"""
    symbol: str
    name: str
    type: str
    region: str
    marketOpen: str
    marketClose: str
    timezone: str
    currency: str
    matchScore: float

class StockPrice(BaseModel):
    """Model for stock price data"""
    date: datetime
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: int
    dividend_amount: float = 0.0
    split_coefficient: float = 1.0

class IndicatorValue(BaseModel):
    """Model for economic indicator data"""
    date: datetime
    value: float
    unit: Optional[str] = None

class OptionsContract(BaseModel):
    """Model for options contract data"""
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

class MarketMover(BaseModel):
    """Model for market mover data"""
    ticker: str
    price: float
    change_amount: float
    change_percentage: float
    volume: int

class TranscriptEntry(BaseModel):
    """Model for a single entry in an earnings call transcript"""
    speaker: str
    title: Optional[str] = ""
    content: str
    sentiment: Optional[float] = 0.0

class Transcript(BaseModel):
    """Model for an earnings call transcript"""
    quarter: str
    date: str
    transcript: List[TranscriptEntry]

class FinancialData(BaseModel):
    """Model for comprehensive financial data"""
    symbol: str
    company_overview: Dict[str, Any] = {}
    income_statement: Dict[str, Any] = {}
    balance_sheet: Dict[str, Any] = {}
    cash_flow: Dict[str, Any] = {}
    insider_transactions: Dict[str, Any] = {}