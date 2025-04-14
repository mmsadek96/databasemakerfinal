# server/database/mongodb_helper.py
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from server.config import get_settings, get_logger
from typing import Dict, Any, List, Optional

logger = get_logger(__name__)


class MongoDBHelper:
    """Minimal MongoDB helper for options data only"""

    def __init__(self):
        self.settings = get_settings()
        self.client = None
        self.db = None
        self.options_collection = None
        self.stocks_collection = None
        self.indicators_collection = None


    def connect(self):
        """Connect to MongoDB"""
        try:
            uri = "mongodb+srv://financial_intelligence_hub:<db_password>@financialintelligencehu.mqr2tur.mongodb.net/?appName=financialintelligencehub"
            # Replace password placeholder with actual password from settings
            uri = uri.replace("<db_password>", self.settings.MONGODB_PASSWORD)

            self.client = MongoClient(uri, server_api=ServerApi('1'))
            # Ping to confirm connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB!")

            # Set up database and collection
            self.db = self.client.financial_intelligence_hub
            self.options_collection = self.db.options_data

            # Create index for efficient lookups
            self.options_collection.create_index([("symbol", 1), ("require_greeks", 1)])

            return True
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False

    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    def store_options_data(self, symbol: str, require_greeks: bool, data: List[Dict[str, Any]]) -> bool:
        """Store options data in MongoDB"""
        try:
            # Store document
            doc = {
                "symbol": symbol,
                "require_greeks": require_greeks,
                "data": data
            }

            # Use upsert to update if exists or insert if not
            result = self.options_collection.update_one(
                {
                    "symbol": symbol,
                    "require_greeks": require_greeks
                },
                {"$set": doc},
                upsert=True
            )

            logger.info(f"Options data stored for {symbol} (greeks: {require_greeks})")
            return True
        except Exception as e:
            logger.error(f"Error storing options data in MongoDB: {e}")
            return False

    def get_options_data(self, symbol: str, require_greeks: bool) -> Optional[List[Dict[str, Any]]]:
        """Get options data from MongoDB"""
        try:
            # Find document
            doc = self.options_collection.find_one({
                "symbol": symbol,
                "require_greeks": require_greeks
            })

            if doc and "data" in doc:
                logger.info(f"Retrieved options data for {symbol} (greeks: {require_greeks})")
                return doc["data"]

            logger.info(f"No options data found for {symbol} (greeks: {require_greeks})")
            return None
        except Exception as e:
            logger.error(f"Error retrieving options data: {e}")
            return None