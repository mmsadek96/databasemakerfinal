import logging
import sys
from pydantic import BaseModel


class LogConfig(BaseModel):
    """Logging configuration"""

    LOGGER_NAME: str = "financial_intelligence_hub"
    LOG_FORMAT: str = "%(levelprefix)s | %(asctime)s | %(message)s"
    LOG_LEVEL: str = "INFO"

    # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
    version: int = 1
    disable_existing_loggers: bool = False
    formatters: dict = {
        "default": {
            "format": LOG_FORMAT,
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    }
    handlers: dict = {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
        },
        "file": {
            "formatter": "default",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "logs/app.log",
            "maxBytes": 10485760,  # 10 MB
            "backupCount": 5,
            "encoding": "utf8",
        },
    }
    loggers: dict = {
        LOGGER_NAME: {
            "handlers": ["default", "file"],
            "level": LOG_LEVEL,
            "propagate": False
        },
    }


def get_logger(name: str = "financial_intelligence_hub"):
    """Get configured logger instance"""
    return logging.getLogger(name)