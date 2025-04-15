# server/services/options_service.py
from typing import List, Dict, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.database.mongodb_helper import MongoDBHelper
from server.config import get_logger

logger = get_logger(__name__)


class OptionsService:
    """Service for options data operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.mongo = MongoDBHelper()
        self.mongo_connected = self.mongo.connect()

    async def get_options_data(self, symbol: str, require_greeks: bool = False) -> List[Dict[str, Any]]:
        """Get options chain data for a given symbol"""
        try:
            # Always fetch from API first, regardless of database status
            logger.info(f"Fetching options data for {symbol} from API")
            options_data = await self.client.get_options_data(symbol, require_greeks)

            if not options_data:
                logger.warning(f"No options data available for {symbol}")
                raise ValueError(f"No options data found for symbol: {symbol}")

            # Store in MongoDB if connection is available, overwriting any existing data
            if self.mongo_connected:
                success = self.mongo.store_options_data(symbol, require_greeks, options_data)
                if success:
                    logger.info(f"Saved options data for {symbol} to MongoDB (overwritten if existed)")
                else:
                    logger.warning(f"Failed to save options data for {symbol} to MongoDB")

            return options_data
        except Exception as e:
            logger.error(f"Error getting options data for {symbol}: {e}")
            raise ValueError(f"Failed to get options data: {str(e)}")