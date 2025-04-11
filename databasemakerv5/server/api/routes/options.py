from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from server.services.options_service import OptionsService
from server.models.response_models import OptionsContractResponse

router = APIRouter(prefix="/api/options", tags=["options"])

@router.get("/{symbol}", response_model=List[OptionsContractResponse])
async def get_options_data(
    symbol: str,
    require_greeks: bool = False,
    options_service: OptionsService = Depends()
):
    """
    Get options chain data for a given symbol
    """
    try:
        options_data = await options_service.get_options_data(symbol, require_greeks)
        return options_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))