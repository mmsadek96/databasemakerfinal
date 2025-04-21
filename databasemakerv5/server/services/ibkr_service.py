import asyncio
import threading
from typing import List, Dict, Any
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from server.config import get_settings, get_logger
from server.database.mongodb_helper import MongoDBHelper

logger = get_logger(__name__)


class _TWSClient(EWrapper, EClient):
    """Internal TWS socket client wrapper"""
    def __init__(self):
        EClient.__init__(self, self)
        self._conn_ready = threading.Event()
        self.next_valid_id = None
        self._summary_data: List[Dict[str, Any]] = []
        self._summary_done = threading.Event()
        self._positions_data: List[Dict[str, Any]] = []
        self._positions_done = threading.Event()

    def nextValidId(self, orderId: int):
        self.next_valid_id = orderId
        self._conn_ready.set()
    
    def error(self, reqId: int, errorCode: int, errorString: str, *args):
        """
        Override default EWrapper.error to suppress informational farm-connection messages.
        """
        # Suppress common informational codes from TWS (farm connection status)
        if errorCode in (2104, 2106, 2158):
            return
        # Log other errors
        logger.error(f"TWS error (reqId={reqId}) code={errorCode} msg={errorString}")

    def accountSummary(self, reqId: int, account: str, tag: str, value: str, currency: str):
        self._summary_data.append({
            "account": account,
            "tag": tag,
            "value": value,
            "currency": currency
        })

    def accountSummaryEnd(self, reqId: int):
        self._summary_done.set()

    def position(self, account: str, contract: Contract, position: float, avgCost: float):
        self._positions_data.append({
            "symbol": contract.symbol,
            "contract_id": str(getattr(contract, "conId", "")),
            "asset_class": contract.secType,
            "position": position,
            "market_price": 0.0,
            "market_value": 0.0,
            "average_cost": avgCost,
            "unrealized_pnl": 0.0,
            "realized_pnl": 0.0,
            "currency": contract.currency,
            "exchange": getattr(contract, "exchange", "")
        })

    def positionEnd(self):
        self._positions_done.set()


class IBKRService:
    """Service for Interactive Brokers TWS (socket API) operations"""

    def __init__(self):
        settings = get_settings()
        self.host: str = settings.TWS_HOST
        self.port: int = settings.TWS_PORT
        self.client_id: int = settings.TWS_CLIENT_ID
        # timeout in seconds for TWS calls
        self.timeout: int = getattr(settings, "TWS_TIMEOUT", 10)
        # Initialize MongoDB helper and connect
        try:
            self.db_helper = MongoDBHelper()
            connected = self.db_helper.connect()
            if not connected:
                logger.error("Failed to connect to MongoDB in IBKRService")
        except Exception as e:
            logger.error(f"Exception initializing MongoDBHelper: {e}")

    def _start_client(self, client: _TWSClient):
        client.run()

    def _fetch_account_summary(self) -> Dict[str, Any]:
        client = _TWSClient()
        client.connect(self.host, self.port, self.client_id)
        thread = threading.Thread(target=self._start_client, args=(client,), daemon=True)
        thread.start()
        if not client._conn_ready.wait(self.timeout):
            client.disconnect()
            raise ValueError("Failed to connect to TWS for account summary")

        tags = ",".join([
            "AccountCode", "AccountType", "NetLiquidation", "TotalCashValue",
            "AvailableFunds", "ExcessLiquidity", "InitMarginReq", "MaintMarginReq",
            "EquityWithLoan", "BuyingPower", "DayTradesRemaining"
        ])
        client.reqAccountSummary(1, "All", tags)
        if not client._summary_done.wait(self.timeout):
            client.cancelAccountSummary(1)
            client.disconnect()
            raise ValueError("Account summary request timed out")

        client.cancelAccountSummary(1)
        client.disconnect()

        # Map raw summary data to structured dict
        data: Dict[str, Any] = {}
        for item in client._summary_data:
            tag = item.get("tag")
            value = item.get("value")
            currency = item.get("currency")
            if tag == "AccountCode":
                data["account_id"] = value
                data["account_title"] = value
            elif tag == "AccountType":
                data["account_type"] = value
            elif tag == "NetLiquidation":
                data["net_liquidation_value"] = float(value)
                data["currency"] = currency
            elif tag == "TotalCashValue":
                data["cash_balance"] = float(value)
            elif tag == "AvailableFunds":
                data["available_funds"] = float(value)
            elif tag == "ExcessLiquidity":
                data["excess_liquidity"] = float(value)
            elif tag == "InitMarginReq":
                data["initial_margin"] = float(value)
            elif tag == "MaintMarginReq":
                data["maintenance_margin"] = float(value)
            elif tag == "EquityWithLoan":
                data["equity_with_loan"] = float(value)
            elif tag == "BuyingPower":
                data["buying_power"] = float(value)
            elif tag == "DayTradesRemaining":
                try:
                    data["day_trades_remaining"] = int(value)
                except ValueError:
                    data["day_trades_remaining"] = 0
        # Ensure all required fields are present, set defaults if missing
        # equity_with_loan and day_trades_remaining may not be returned by TWS
        data.setdefault("equity_with_loan", 0.0)
        data.setdefault("day_trades_remaining", 0)
        return data

    def _fetch_positions(self) -> List[Dict[str, Any]]:
        client = _TWSClient()
        client.connect(self.host, self.port, self.client_id)
        thread = threading.Thread(target=self._start_client, args=(client,), daemon=True)
        thread.start()
        if not client._conn_ready.wait(self.timeout):
            client.disconnect()
            raise ValueError("Failed to connect to TWS for positions")

        client.reqPositions()
        if not client._positions_done.wait(self.timeout):
            client.disconnect()
            raise ValueError("Positions request timed out")

        client.disconnect()
        return client._positions_data

    async def get_account_summary(self) -> Dict[str, Any]:
        loop = asyncio.get_event_loop()
        summary = await loop.run_in_executor(None, self._fetch_account_summary)
        # Store summary in MongoDB
        try:
            if hasattr(self, 'db_helper'):
                self.db_helper.store_ibkr_summary(summary)
        except Exception as e:
            logger.error(f"Failed to store IBKR summary in MongoDB: {e}")
        return summary

    async def get_positions(self) -> List[Dict[str, Any]]:
        loop = asyncio.get_event_loop()
        positions = await loop.run_in_executor(None, self._fetch_positions)
        # Store positions in MongoDB
        try:
            if hasattr(self, 'db_helper'):
                self.db_helper.store_ibkr_positions(positions)
        except Exception as e:
            logger.error(f"Failed to store IBKR positions in MongoDB: {e}")
        return positions
    
    def _test_connection(self) -> str:
        """Test socket connection to TWS."""
        client = _TWSClient()
        client.connect(self.host, self.port, self.client_id)
        # wait for nextValidId
        if not client._conn_ready.wait(self.timeout):
            client.disconnect()
            raise ValueError(f"Could not connect to TWS at {self.host}:{self.port}")
        client.disconnect()
        return f"Connected to TWS at {self.host}:{self.port}"  

    async def test_connection(self) -> str:
        """Async wrapper for testing TWS connection."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._test_connection)

    # TWS not yet implemented for orders and other endpoints
    async def get_orders(self, status: str = "active") -> List[Dict[str, Any]]:
        raise ValueError("TWS order fetching not implemented")

    async def get_trade_history(self, days: int = 30) -> List[Dict[str, Any]]:
        raise ValueError("TWS trade history not implemented")

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        raise ValueError("TWS order placement not implemented")

    async def get_market_data(self, symbols: List[str], fields: List[str] = None) -> Dict[str, Any]:
        raise ValueError("TWS market data not implemented")

    async def search_symbols(self, query: str) -> List[Dict[str, Any]]:
        raise ValueError("TWS symbol search not implemented")

    async def get_account_performance(self, period: str = "YTD") -> Dict[str, Any]:
        """Get stubbed performance data based on current account net liquidation"""
        # fetch current account summary
        summary = await self.get_account_summary()
        nl = summary.get("net_liquidation_value", 0.0)
        # construct performance response
        perf: Dict[str, Any] = {
            "time_period": period,
            "starting_value": nl,
            "ending_value": nl,
            "time_weighted_return": 0.0,
            "deposits_withdrawals": 0.0,
            "change_in_value": 0.0,
            "returns_by_asset_class": {},
            "returns_by_sector": {}
        }
        return perf