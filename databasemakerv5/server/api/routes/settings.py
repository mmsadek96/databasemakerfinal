from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from server.services.settings_service import SettingsService
from typing import Dict

router = APIRouter(prefix="/api", tags=["settings"])

class APIKeyUpdate(BaseModel):
    apikey: str

@router.get("/apikey", response_model=Dict[str, str])
async def get_apikey(
    settings_service: SettingsService = Depends()
):
    """
    Return the current API key being used
    """
    return {"apikey": await settings_service.get_api_key()}

@router.post("/apikey")
async def update_apikey(
    key_data: APIKeyUpdate,
    settings_service: SettingsService = Depends()
):
    """
    Update the API key
    """
    await settings_service.update_api_key(key_data.apikey)
    return {
        "message": "API key updated successfully",
        "apikey": await settings_service.get_api_key()
    }

@router.get("/market/movers")
async def get_market_movers(
    settings_service: SettingsService = Depends()
):
    """
    Get top gainers, losers, and most actively traded stocks
    """
    try:
        return await settings_service.get_market_movers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))