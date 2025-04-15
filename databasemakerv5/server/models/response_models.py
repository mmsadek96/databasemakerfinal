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

# Binance Response Models
class BinanceBalanceItem(BaseModel):
    """Model for a single balance item in Binance account"""
    asset: str
    free: str
    locked: str

class AccountInfoResponse(BaseModel):
    """Response model for Binance account information"""
    makerCommission: int
    takerCommission: int
    buyerCommission: int
    sellerCommission: int
    canTrade: bool
    canWithdraw: bool
    canDeposit: bool
    updateTime: int
    accountType: str
    balances: List[Dict[str, Any]]
    permissions: List[str]

class ConnectionTestResponse(BaseModel):
    """Response model for Binance connection test"""
    status: str
    ping: bool
    auth: bool
    message: str

class BinanceOrderResponse(BaseModel):
    """Response model for Binance order information"""
    symbol: str
    orderId: int
    orderListId: int
    clientOrderId: str
    price: str
    origQty: str
    executedQty: str
    status: str
    timeInForce: str
    type: str
    side: str
    stopPrice: str
    icebergQty: str
    time: int
    updateTime: int
    isWorking: bool
    origQuoteOrderQty: str

class TradingPairResponse(BaseModel):
    """Response model for Binance trading pair information"""
    symbol: str
    baseAsset: str
    quoteAsset: str
    filters: List[Dict[str, Any]]