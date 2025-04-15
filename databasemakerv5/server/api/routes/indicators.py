from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from server.services.indicators_service import IndicatorsService
from server.models.response_models import IndicatorDataResponse

router = APIRouter(prefix="/api/indicator", tags=["indicators"])

@router.get("/{indicator_name}", response_model=List[IndicatorDataResponse])
async def get_indicator_data(
    indicator_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    indicators_service: IndicatorsService = Depends()
):
    """
    Get economic indicator data
    """
    try:
        indicator_data = await indicators_service.get_indicator_data(
            indicator_name, start_date, end_date
        )
        return indicator_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/available/list", response_model=dict)
async def get_available_indicators(
    indicators_service: IndicatorsService = Depends()
):
    """
    Get list of available economic indicators
    """
    return await indicators_service.get_available_indicators()