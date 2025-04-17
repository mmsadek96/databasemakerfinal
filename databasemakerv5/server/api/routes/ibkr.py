# server/api/routes/ibkr.py
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from server.services.ibkr_service import IBKRService
from server.models.response_models import (
    IBKRAccountSummaryResponse,
    IBKRPositionResponse,
    IBKROrderResponse,
    IBKRTradeResponse,
    IBKRPerformanceResponse
)

router = APIRouter(prefix="/api/ibkr", tags=["ibkr"])

@router.get("/account/summary", response_model=IBKRAccountSummaryResponse)
async def get_account_summary(
    ibkr_service: IBKRService = Depends()
):
    """
    Get IBKR account summary
    """
    try:
        summary = await ibkr_service.get_account_summary()
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions", response_model=List[IBKRPositionResponse])
async def get_positions(
    ibkr_service: IBKRService = Depends()
):
    """
    Get current portfolio positions
    """
    try:
        positions = await ibkr_service.get_positions()
        return positions
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", response_model=List[IBKROrderResponse])
async def get_orders(
    status: str = "active",
    ibkr_service: IBKRService = Depends()
):
    """
    Get orders by status (active, completed, canceled)
    """
    try:
        orders = await ibkr_service.get_orders(status)
        return orders
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trades", response_model=List[IBKRTradeResponse])
async def get_trade_history(
    days: int = Query(30, ge=1, le=90),
    ibkr_service: IBKRService = Depends()
):
    """
    Get trade history for the specified number of days
    """
    try:
        trades = await ibkr_service.get_trade_history(days)
        return trades
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/orders", response_model=dict)
async def place_order(
    order_data: dict,
    ibkr_service: IBKRService = Depends()
):
    """
    Place a new order
    """
    try:
        result = await ibkr_service.place_order(order_data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-data", response_model=dict)
async def get_market_data(
    symbols: List[str] = Query(...),
    fields: Optional[List[str]] = None,
    ibkr_service: IBKRService = Depends()
):
    """
    Get market data for specified symbols
    """
    try:
        data = await ibkr_service.get_market_data(symbols, fields)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=List[dict])
async def search_symbols(
    query: str = Query(..., min_length=1),
    ibkr_service: IBKRService = Depends()
):
    """
    Search for symbols/contracts
    """
    try:
        results = await ibkr_service.search_symbols(query)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance", response_model=IBKRPerformanceResponse)
async def get_account_performance(
    period: str = Query("YTD", regex="^(1D|1W|1M|3M|6M|1Y|YTD)$"),
    ibkr_service: IBKRService = Depends()
):
    """
    Get account performance metrics
    """
    try:
        performance = await ibkr_service.get_account_performance(period)
        return performance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))