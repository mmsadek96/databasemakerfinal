# server/services/ibkr_service.py
import requests
import pandas as pd
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from server.config import get_settings, get_logger
from server.utils.data_processing import apply_date_filter

logger = get_logger(__name__)


class IBKRService:
    """Service for Interactive Brokers API operations"""

    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.IBKR_API_URL
        self.api_key = self.settings.IBKR_API_KEY
        self.account_id = self.settings.IBKR_ACCOUNT_ID
        self.session_token = None

    async def _get_session_token(self) -> str:
        """Get a session token for authenticated requests"""
        if self.session_token:
            return self.session_token

        try:
            async with aiohttp.ClientSession() as session:
                auth_url = f"{self.base_url}/auth/status"
                headers = {
                    "Content-Type": "application/json",
                    "X-API-Key": self.api_key
                }

                async with session.post(auth_url, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"IBKR authentication failed with status {response.status}")
                        raise ValueError(f"IBKR authentication failed")

                    data = await response.json()
                    self.session_token = data.get("token")
                    return self.session_token
        except Exception as e:
            logger.error(f"IBKR authentication error: {str(e)}")
            raise ValueError(f"Failed to authenticate with IBKR: {str(e)}")

    async def _make_request(self, endpoint: str, method: str = "GET", params: Optional[Dict[str, Any]] = None) -> Dict[
        str, Any]:
        """Make an authenticated request to IBKR API"""
        try:
            token = await self._get_session_token()
            url = f"{self.base_url}/{endpoint}"

            headers = {
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "Authorization": f"Bearer {token}"
            }

            async with aiohttp.ClientSession() as session:
                if method.upper() == "GET":
                    async with session.get(url, headers=headers, params=params) as response:
                        if response.status != 200:
                            logger.error(f"IBKR API request failed: {response.status}")
                            raise ValueError(f"IBKR API request failed with status {response.status}")

                        return await response.json()
                elif method.upper() == "POST":
                    async with session.post(url, headers=headers, json=params) as response:
                        if response.status != 200:
                            logger.error(f"IBKR API request failed: {response.status}")
                            raise ValueError(f"IBKR API request failed with status {response.status}")

                        return await response.json()
        except Exception as e:
            logger.error(f"IBKR API request error: {str(e)}")
            raise ValueError(f"Failed to make IBKR API request: {str(e)}")

    async def get_account_summary(self) -> Dict[str, Any]:
        """Get account summary data"""
        try:
            endpoint = f"portfolio/{self.account_id}/summary"
            return await self._make_request(endpoint)
        except Exception as e:
            logger.error(f"Error fetching IBKR account summary: {e}")
            raise ValueError(f"Failed to fetch account summary: {str(e)}")

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get current portfolio positions"""
        try:
            endpoint = f"portfolio/{self.account_id}/positions"
            data = await self._make_request(endpoint)
            return data.get("positions", [])
        except Exception as e:
            logger.error(f"Error fetching IBKR positions: {e}")
            raise ValueError(f"Failed to fetch positions: {str(e)}")

    async def get_orders(self, status: str = "active") -> List[Dict[str, Any]]:
        """Get orders (active, completed, or canceled)"""
        try:
            # Status can be: active, completed, canceled
            endpoint = f"iserver/account/orders"
            params = {"status": status}
            data = await self._make_request(endpoint, params=params)
            return data.get("orders", [])
        except Exception as e:
            logger.error(f"Error fetching IBKR orders: {e}")
            raise ValueError(f"Failed to fetch orders: {str(e)}")

    async def get_trade_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get trade history for the specified number of days"""
        try:
            endpoint = f"iserver/account/trades"
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            params = {
                "from": start_date.strftime("%Y%m%d"),
                "to": end_date.strftime("%Y%m%d")
            }

            data = await self._make_request(endpoint, params=params)
            return data.get("trades", [])
        except Exception as e:
            logger.error(f"Error fetching IBKR trade history: {e}")
            raise ValueError(f"Failed to fetch trade history: {str(e)}")

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Place a new order"""
        try:
            endpoint = f"iserver/account/{self.account_id}/orders"
            return await self._make_request(endpoint, method="POST", params=order_data)
        except Exception as e:
            logger.error(f"Error placing IBKR order: {e}")
            raise ValueError(f"Failed to place order: {str(e)}")

    async def get_market_data(self, symbols: List[str], fields: List[str] = None) -> Dict[str, Any]:
        """Get market data for specified symbols"""
        if not fields:
            fields = ["31", "84", "85", "86", "88"]  # Last, Bid, Ask, BidSize, AskSize

        try:
            endpoint = "iserver/marketdata/snapshot"
            params = {
                "conids": ",".join(symbols),
                "fields": ",".join(fields)
            }

            return await self._make_request(endpoint, params=params)
        except Exception as e:
            logger.error(f"Error fetching IBKR market data: {e}")
            raise ValueError(f"Failed to fetch market data: {str(e)}")

    async def search_symbols(self, query: str) -> List[Dict[str, Any]]:
        """Search for symbols/contracts"""
        try:
            endpoint = "iserver/secdef/search"
            params = {"symbol": query}

            data = await self._make_request(endpoint, method="POST", params=params)
            return data
        except Exception as e:
            logger.error(f"Error searching IBKR symbols: {e}")
            raise ValueError(f"Failed to search symbols: {str(e)}")

    async def get_account_performance(self, period: str = "YTD") -> Dict[str, Any]:
        """Get account performance metrics"""
        # period can be: 1D, 1W, 1M, 3M, 6M, 1Y, YTD
        try:
            endpoint = f"portfolio/{self.account_id}/performance"
            params = {"period": period}

            return await self._make_request(endpoint, params=params)
        except Exception as e:
            logger.error(f"Error fetching IBKR account performance: {e}")
            raise ValueError(f"Failed to fetch account performance: {str(e)}")