from fastapi import APIRouter, HTTPException, Depends, Request, Body
from typing import List, Dict, Optional, Any
from server.services.binance_service import BinanceService
from pydantic import BaseModel
from server.config import get_logger
from server.models.response_models import AccountInfoResponse, ConnectionTestResponse
import socket
import os

router = APIRouter(prefix="/api/binance", tags=["binance"])
logger = get_logger(__name__)


# Pydantic models for request validation
class BinanceCredentials(BaseModel):
    api_key: str
    api_secret: str
    allowed_ips: Optional[List[str]] = None


class TradingPair(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str


# Dependency to get binance service with credentials
async def get_binance_service():
    service = BinanceService()
    # Try to load API credentials from environment or configuration
    api_key = os.environ.get("BINANCE_API_KEY")
    api_secret = os.environ.get("BINANCE_API_SECRET")
    allowed_ips = os.environ.get("BINANCE_ALLOWED_IPS", "").split(",") if os.environ.get("BINANCE_ALLOWED_IPS") else []

    if api_key and api_secret:
        service.set_credentials(api_key, api_secret, allowed_ips)

    return service


@router.post("/set-credentials")
async def set_binance_credentials(
        credentials: BinanceCredentials,
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Set API credentials for Binance"""
    try:
        # Set the credentials
        binance_service.set_credentials(
            credentials.api_key,
            credentials.api_secret,
            credentials.allowed_ips
        )

        # Store credentials in environment variables for persistence
        os.environ["BINANCE_API_KEY"] = credentials.api_key
        os.environ["BINANCE_API_SECRET"] = credentials.api_secret
        if credentials.allowed_ips:
            os.environ["BINANCE_ALLOWED_IPS"] = ",".join(credentials.allowed_ips)

        # Test the connection
        connection_test = await binance_service.test_connection()

        return {
            "message": "Credentials set successfully",
            "connection_test": connection_test
        }
    except Exception as e:
        logger.error(f"Error setting credentials: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/account", response_model=AccountInfoResponse)
async def get_account_info(
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Get account information from Binance"""
    try:
        account_info = await binance_service.get_account_info()
        return account_info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting account info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/open-orders")
async def get_open_orders(
        symbol: Optional[str] = None,
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Get open orders from Binance"""
    try:
        open_orders = await binance_service.get_open_orders(symbol)
        return open_orders
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting open orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trading-pairs")
async def get_trading_pairs(
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Get available trading pairs from Binance"""
    try:
        trading_pairs = await binance_service.get_trading_pairs()
        return trading_pairs
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting trading pairs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-connection", response_model=ConnectionTestResponse)
async def test_connection(
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Test connection to Binance API"""
    try:
        result = await binance_service.test_connection()
        return result
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ip-status")
async def get_ip_status(
        request: Request,
        binance_service: BinanceService = Depends(get_binance_service)
):
    """Check if the current IP is in the allowed list"""
    try:
        # Get client IP from request
        client_ip = request.client.host if request.client else None
        if not client_ip:
            # Fallback to get local IP
            hostname = socket.gethostname()
            client_ip = socket.gethostbyname(hostname)

        # Check IP status
        ip_status = await binance_service.get_allowed_ip_status(client_ip)

        return {
            "current_ip": client_ip,
            "status": ip_status
        }
    except Exception as e:
        logger.error(f"Error checking IP status: {e}")
        raise HTTPException(status_code=500, detail=str(e))