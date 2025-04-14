from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from server.services.correlation_service import CorrelationService
from server.models.response_models import CorrelationResponse

router = APIRouter(prefix="/api/correlation", tags=["correlation"])


@router.get("", response_model=CorrelationResponse)
async def get_correlation(
        stocks: List[str] = Query(None),
        indicators: List[str] = Query(None),
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        correlation_service: CorrelationService = Depends()
):
    """
    Get correlation matrix for selected stocks and indicators
    """
    try:
        if not stocks and not indicators:
            raise ValueError("At least one stock or indicator must be specified")

        corr_data = await correlation_service.calculate_correlation(
            stocks, indicators, start_date, end_date
        )
        return corr_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))