from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from server.services.stock_service import StockService
from server.models.response_models import StockDataResponse

router = APIRouter(prefix="/api/stock", tags=["stocks"])

@router.get("/{symbol}", response_model=List[StockDataResponse])
async def get_stock_data(
    symbol: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    stock_service: StockService = Depends()
):
    """
    Get stock price data for a given symbol
    """
    try:
        stock_data = await stock_service.get_stock_data(symbol, start_date, end_date)
        return stock_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{symbol}/intraday", response_model=List[StockDataResponse])
async def get_stock_intraday(
    symbol: str,
    interval: str = Query("5min", description="Time interval (1min, 5min, 15min, 30min, 60min)"),
    stock_service: StockService = Depends()
):
    """
    Get intraday stock price data for a given symbol
    """
    try:
        stock_data = await stock_service.get_stock_intraday(symbol, interval)
        return stock_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))



@router.get("/search/{keywords}", response_model=List[dict])
async def search_symbols(
    keywords: str,
    stock_service: StockService = Depends()
):
    """
    Search for stock symbols by keywords
    """
    try:
        results = await stock_service.search_symbols(keywords)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))