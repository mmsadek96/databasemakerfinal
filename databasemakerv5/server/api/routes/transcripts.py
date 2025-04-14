from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from server.services.transcript_service import TranscriptService
from server.models.response_models import TranscriptAnalysisResponse

router = APIRouter(prefix="/api/earnings", tags=["earnings"])

@router.get("/analyze/{symbol}", response_model=TranscriptAnalysisResponse)
async def analyze_transcript(
    symbol: str,
    quarter: Optional[str] = None,
    analyze_past_quarters: bool = Query(False),
    num_quarters: int = Query(4),
    include_financials: bool = Query(True),
    transcript_service: TranscriptService = Depends()
):
    """
    Fetch and analyze earnings call transcript(s) for a company
    """
    try:
        analysis = await transcript_service.fetch_and_analyze_transcript(
            symbol,
            quarter,
            analyze_past_quarters,
            num_quarters,
            include_financials
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))