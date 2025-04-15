from typing import Dict, List, Optional, Any
import hmac
import hashlib
import time
import requests
import urllib.parse
from server.config import get_settings, get_logger
from fastapi import HTTPException

logger = get_logger(__name__)


class BinanceService:
    """Service for interacting with Binance API"""

    def __init__(self):
        self.settings = get_settings()
        self.base_url = 'https://api.binance.com'
        self.api_key = None
        self.api_secret = None
        self.allowed_ips = []

    def set_credentials(self, api_key: str, api_secret: str, allowed_ips: Optional[List[str]] = None):
        """Set API credentials for Binance"""
        self.api_key = api_key
        self.api_secret = api_secret
        self.allowed_ips = allowed_ips or []

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for authenticated requests"""
        if not self.api_key:
            raise ValueError("API key is not set. Please configure your Binance credentials.")

        return {
            'X-MBX-APIKEY': self.api_key
        }

    def _get_signature(self, params: Dict[str, Any]) -> str:
        """Create a signature for authenticated requests"""
        if not self.api_secret:
            raise ValueError("API secret is not set. Please configure your Binance credentials.")

        query_string = urllib.parse.urlencode(params)
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return signature

    async def get_account_info(self) -> Dict[str, Any]:
        """Get account information"""
        try:
            if not self.api_key or not self.api_secret:
                raise ValueError("API key and secret are required for account information")

            endpoint = '/api/v3/account'
            params = {
                'timestamp': int(time.time() * 1000)
            }

            # Add signature
            params['signature'] = self._get_signature(params)

            # Make request
            url = f"{self.base_url}{endpoint}?{urllib.parse.urlencode(params)}"
            response = requests.get(url, headers=self._get_headers())

            if response.status_code != 200:
                logger.error(f"Binance API error: {response.status_code} - {response.text}")
                error_data = response.json() if response.text else {"code": response.status_code,
                                                                    "msg": "Unknown error"}
                raise HTTPException(status_code=response.status_code, detail=error_data)

            return response.json()
        except Exception as e:
            logger.error(f"Error getting account info: {str(e)}")
            raise ValueError(f"Failed to get account information: {str(e)}")

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get open orders, optionally filtered by symbol"""
        try:
            if not self.api_key or not self.api_secret:
                raise ValueError("API key and secret are required for open orders")

            endpoint = '/api/v3/openOrders'
            params = {
                'timestamp': int(time.time() * 1000)
            }

            if symbol:
                params['symbol'] = symbol

            # Add signature
            params['signature'] = self._get_signature(params)

            # Make request
            url = f"{self.base_url}{endpoint}?{urllib.parse.urlencode(params)}"
            response = requests.get(url, headers=self._get_headers())

            if response.status_code != 200:
                logger.error(f"Binance API error: {response.status_code} - {response.text}")
                error_data = response.json() if response.text else {"code": response.status_code,
                                                                    "msg": "Unknown error"}
                raise HTTPException(status_code=response.status_code, detail=error_data)

            return response.json()
        except Exception as e:
            logger.error(f"Error getting open orders: {str(e)}")
            raise ValueError(f"Failed to get open orders: {str(e)}")

    async def get_trading_pairs(self) -> List[Dict[str, Any]]:
        """Get available trading pairs (exchange information)"""
        try:
            endpoint = '/api/v3/exchangeInfo'

            # Make request (no auth required for this endpoint)
            url = f"{self.base_url}{endpoint}"
            response = requests.get(url)

            if response.status_code != 200:
                logger.error(f"Binance API error: {response.status_code} - {response.text}")
                error_data = response.json() if response.text else {"code": response.status_code,
                                                                    "msg": "Unknown error"}
                raise HTTPException(status_code=response.status_code, detail=error_data)

            data = response.json()

            # Extract relevant symbol information
            symbols = []
            for symbol in data.get('symbols', []):
                if symbol.get('status') == 'TRADING':
                    symbols.append({
                        'symbol': symbol.get('symbol'),
                        'baseAsset': symbol.get('baseAsset'),
                        'quoteAsset': symbol.get('quoteAsset'),
                        'filters': symbol.get('filters')
                    })

            return symbols
        except Exception as e:
            logger.error(f"Error getting trading pairs: {str(e)}")
            raise ValueError(f"Failed to get trading pairs: {str(e)}")

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Binance API"""
        try:
            if not self.api_key or not self.api_secret:
                raise ValueError("API key and secret are required for connection test")

            # Use a simple endpoint for testing
            endpoint = '/api/v3/ping'

            # Make request
            url = f"{self.base_url}{endpoint}"
            response = requests.get(url)

            ping_successful = response.status_code == 200

            # Try authenticated endpoint
            if ping_successful:
                try:
                    endpoint = '/api/v3/account'
                    params = {
                        'timestamp': int(time.time() * 1000)
                    }
                    params['signature'] = self._get_signature(params)
                    url = f"{self.base_url}{endpoint}?{urllib.parse.urlencode(params)}"
                    auth_response = requests.get(url, headers=self._get_headers())
                    auth_successful = auth_response.status_code == 200
                except Exception:
                    auth_successful = False
            else:
                auth_successful = False

            return {
                "status": "success" if ping_successful else "failed",
                "ping": ping_successful,
                "auth": auth_successful,
                "message": "Connection successful" if ping_successful and auth_successful else "Connection failed" if not ping_successful else "Authentication failed"
            }
        except Exception as e:
            logger.error(f"Error testing connection: {str(e)}")
            return {
                "status": "failed",
                "ping": False,
                "auth": False,
                "message": f"Connection test failed: {str(e)}"
            }

    async def get_allowed_ip_status(self, configured_ip: str) -> Dict[str, Any]:
        """Check if configured IP is in the list of allowed IPs"""
        if not self.allowed_ips:
            return {
                "status": "unconfigured",
                "message": "No IP restrictions configured"
            }

        if configured_ip in self.allowed_ips:
            return {
                "status": "allowed",
                "message": "IP is in the allowed list"
            }
        else:
            return {
                "status": "restricted",
                "message": "IP is not in the allowed list"
            }