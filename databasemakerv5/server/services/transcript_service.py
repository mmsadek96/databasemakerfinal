import datetime
from typing import Dict, List, Optional, Any
from server.services.alpha_vantage import AlphaVantageClient
from server.services.openai_service import OpenAIService
from server.utils.calculations import calculate_sentiment
from server.utils.formatters import format_financial_data_for_openai
from server.config import get_logger
from server.config import get_settings

logger = get_logger(__name__)


class TranscriptService:
    """Service for transcript analysis operations"""

    def __init__(self):
        self.client = AlphaVantageClient()
        self.openai = OpenAIService()
        self.settings = get_settings()

    def get_previous_quarter(self, year: int, quarter: int) -> str:
        """Get the previous quarter string in YYYYQM format"""
        year, quarter = self._get_previous_quarter_values(year, quarter)
        return f"{year}Q{quarter}"

    def _get_previous_quarter_values(self, year: int, quarter: int) -> tuple:
        """Get the previous quarter values (year and quarter number)"""
        if quarter > 1:
            return year, quarter - 1
        else:
            return year - 1, 4

    async def fetch_and_analyze_transcript(
            self, symbol: str, quarter: Optional[str] = None,
            analyze_past_quarters: bool = False, num_quarters: int = 4,
            include_financials: bool = True
    ) -> Dict[str, Any]:
        """Fetch and analyze earnings call transcript(s)"""
        try:
            # Get current date information for determining quarters
            current_date = datetime.datetime.now()
            current_year = current_date.year
            current_month = current_date.month
            current_quarter = (current_month - 1) // 3 + 1

            # If quarter is not specified, determine the most recent quarter
            if not quarter:
                # Default to current quarter
                quarter = f"{current_year}Q{current_quarter}"

            # Fetch the primary transcript
            primary_transcript = await self.client.get_earnings_transcript(symbol, quarter)

            if not primary_transcript or 'transcript' not in primary_transcript or not primary_transcript['transcript']:
                # If current quarter not available, try previous quarter
                previous_quarter = self.get_previous_quarter(current_year, current_quarter)
                primary_transcript = await self.client.get_earnings_transcript(symbol, previous_quarter)
                quarter = previous_quarter

                # If still no transcript found
                if not primary_transcript or 'transcript' not in primary_transcript or not primary_transcript[
                    'transcript']:
                    raise ValueError(f"No earnings call transcript found for {symbol} in {quarter}")

            # Prepare to collect additional transcripts if requested
            all_transcripts = [primary_transcript]
            all_quarters = [quarter]

            # If we should analyze past quarters as well
            if analyze_past_quarters and num_quarters > 1:
                # Parse the primary quarter
                year, q = int(quarter[:4]), int(quarter[5:])

                # Fetch previous quarters' transcripts
                for i in range(1, num_quarters):
                    year, q = self._get_previous_quarter_values(year, q)
                    prev_quarter = f"{year}Q{q}"
                    prev_transcript = await self.client.get_earnings_transcript(symbol, prev_quarter)

                    if prev_transcript and 'transcript' in prev_transcript and prev_transcript['transcript']:
                        all_transcripts.append(prev_transcript)
                        all_quarters.append(prev_quarter)

            # Process transcripts for sentiment
            for transcript in all_transcripts:
                for entry in transcript['transcript']:
                    if 'sentiment' not in entry or entry['sentiment'] == 0:
                        entry['sentiment'] = calculate_sentiment(entry.get('content', ''))

            # Perform analysis on the primary transcript
            primary_analysis = await self.analyze_single_transcript(symbol, primary_transcript)

            # If we have multiple transcripts, perform comparative analysis
            comparative_analysis = None
            if len(all_transcripts) > 1:
                comparative_analysis = await self.analyze_multiple_transcripts(symbol, all_transcripts, all_quarters)

            # Prepare result
            result = {
                "symbol": symbol,
                "quarter": quarter,
                "transcript": primary_transcript,
                "primary_analysis": primary_analysis,
                "additional_quarters_analyzed": all_quarters[1:] if len(all_quarters) > 1 else [],
                "comparative_analysis": comparative_analysis
            }

            # Add financial data if requested
            if include_financials:
                try:
                    financial_data = await self.client.get_financial_data(symbol)
                    result["financial_data"] = financial_data

                    # If we have financial data, update the analysis with financial context
                    if result.get("primary_analysis") and any(financial_data.values()):
                        result = await self.enhance_analysis_with_financials(result, financial_data)
                except Exception as e:
                    logger.error(f"Error adding financial data for {symbol}: {e}")
                    # Continue without financial data if there's an error
                    result["financial_data_error"] = str(e)

            return result
        except Exception as e:
            logger.error(f"Error analyzing transcript for {symbol}: {e}")
            raise ValueError(f"Failed to analyze transcript: {str(e)}")

    async def analyze_single_transcript(self, symbol: str, transcript_data: Dict[str, Any]) -> str:
        """Analyze a single earnings call transcript using OpenAI"""
        if not transcript_data or 'transcript' not in transcript_data or not transcript_data['transcript']:
            return "No transcript data available to analyze."

        try:
            # Extract quarter information
            quarter = transcript_data.get('quarter', 'Unknown quarter')

            # Calculate average sentiment
            sentiments = [float(entry.get('sentiment', 0)) for entry in transcript_data['transcript']
                          if entry.get('sentiment') is not None]
            avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0

            # Extract executives (CEO, CFO) content
            executive_comments = []
            for entry in transcript_data['transcript']:
                title = entry.get('title', '').lower()
                if 'ceo' in title or 'chief executive' in title or 'cfo' in title or 'chief financial' in title:
                    executive_comments.append({
                        "speaker": entry['speaker'],
                        "title": entry['title'],
                        "content": entry['content'][:500] + "..." if len(entry['content']) > 500 else entry['content']
                    })

            # Create the prompt for OpenAI
            prompt = f"""
You are an expert financial analyst specializing in analyzing earnings call transcripts. Analyze this {quarter} earnings call for {symbol} and provide an investment perspective.

### Earnings Call Overview ###
Company: {symbol}
Quarter: {quarter}
Overall sentiment: {avg_sentiment:.2f} (-1 to 1 scale, where 1 is most positive)

### Key Executive Statements ###
{executive_comments[:5]}  # Limiting to first 5 statements to keep prompt manageable

### Instructions ###
1. Identify and summarize the key points discussed in this earnings call:
   - Financial performance highlights (revenue, earnings, margins)
   - Management's outlook and guidance
   - Major strategic initiatives or changes mentioned
   - Challenges or risks acknowledged
   - Any unexpected or particularly noteworthy information

2. Analyze the tone and confidence of management:
   - Are they optimistic, cautious, or concerned?
   - Do they seem to be transparent about challenges?
   - How do they respond to difficult questions?

3. Provide an investment perspective:
   - What are the key takeaways for investors?
   - What are the main strengths and risks based on this call?
   - How might this information impact the stock in the short and medium term?

4. Include a summary assessment (2-3 sentences) that captures the most important insights from this call.

Your analysis should be detailed, objective, and focused on information that would be valuable for investment decision-making.
"""

            # Call OpenAI API with the prompt
            analysis = await self.openai.generate_analysis(prompt)
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing single transcript for {symbol}: {e}")
            return f"Error generating analysis: {str(e)}"

    async def analyze_multiple_transcripts(self, symbol: str, transcripts: List[Dict[str, Any]],
                                           quarters: List[str]) -> str:
        """Analyze multiple earnings call transcripts to identify trends"""
        if not transcripts or len(transcripts) < 2:
            return "Not enough transcript data for comparative analysis."

        try:
            # Calculate sentiment trends
            sentiment_by_quarter = {}
            for i, transcript in enumerate(transcripts):
                if 'transcript' in transcript and transcript['transcript']:
                    sentiments = [float(entry.get('sentiment', 0)) for entry in transcript['transcript']
                                  if entry.get('sentiment') is not None]
                    sentiment_by_quarter[quarters[i]] = sum(sentiments) / len(sentiments) if sentiments else 0

            # Sort quarters chronologically
            sorted_quarters = sorted(sentiment_by_quarter.keys())
            sentiment_trend = [f"{q}: {sentiment_by_quarter[q]:.2f}" for q in sorted_quarters]

            # Extract key topics mentioned across quarters
            all_executive_comments = []
            for i, transcript in enumerate(transcripts):
                if 'transcript' in transcript and transcript['transcript']:
                    for entry in transcript['transcript']:
                        title = entry.get('title', '').lower()
                        if 'ceo' in title or 'chief executive' in title:
                            all_executive_comments.append({
                                "quarter": quarters[i],
                                "speaker": entry['speaker'],
                                "content": entry['content'][:300] + "..." if len(entry['content']) > 300 else entry[
                                    'content']
                            })
                            break  # Just take the first CEO comment from each transcript

            # Create the prompt for OpenAI
            prompt = f"""
You are an expert financial analyst who specializes in comparing earnings calls over time to identify business trends. Analyze these {len(transcripts)} earnings calls for {symbol} spanning {sorted_quarters[0]} to {sorted_quarters[-1]} and provide insights on the company's trajectory.

### Earnings Call Timeline for {symbol} ###
Quarters analyzed: {", ".join(sorted_quarters)}
Sentiment trend: {", ".join(sentiment_trend)}

### CEO Comments Across Quarters ###
{all_executive_comments}

### Instructions ###
1. Identify key trends across these earnings calls:
   - Financial trajectory (improving, stable, deteriorating)
   - Recurring themes or priorities
   - Evolution of management's tone and confidence
   - Changes in strategic focus or initiatives
   - Consistency in addressing challenges/opportunities

2. Compare management statements across quarters:
   - Are they delivering on previous promises?
   - Has their outlook or guidance changed significantly?
   - Do they acknowledge and address previous challenges?
   - Is there consistency in their messaging and priorities?

3. Provide an investment perspective based on this timeline:
   - What does this sequence of calls suggest about the company's direction?
   - Are there any patterns that indicate potential opportunities or risks?
   - Has management's credibility strengthened or weakened over time?
   - How might this historical context inform investment decisions?

4. Include a clear assessment of the company's trajectory and what investors should watch for in future calls.

Your analysis should highlight the most significant patterns and changes over time, providing investors with a longitudinal perspective they couldn't get from a single earnings call.
"""

            # Call OpenAI API with the prompt
            analysis = await self.openai.generate_analysis(prompt)
            return analysis
        except Exception as e:
            logger.error(f"Error analyzing multiple transcripts for {symbol}: {e}")
            return f"Error generating comparative analysis: {str(e)}"

    async def enhance_analysis_with_financials(self, analysis_result: Dict[str, Any],
                                               financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance the transcript analysis with financial data context"""
        try:
            # Only proceed if we have a primary analysis and financial data
            if not analysis_result.get("primary_analysis") or not any(financial_data.values()):
                return analysis_result

            # Format financial data for OpenAI prompt
            financial_summary = format_financial_data_for_openai(financial_data)

            # Create an enhanced prompt that includes financial context
            symbol = analysis_result["symbol"]
            quarter = analysis_result["quarter"]
            transcript = analysis_result.get("transcript", {})

            # Filter for executive statements
            exec_statements = []
            if transcript and "transcript" in transcript:
                for entry in transcript["transcript"]:
                    title = (entry.get("title") or "").lower()
                    if "ceo" in title or "chief executive" in title or "cfo" in title or "chief financial" in title:
                        exec_statements.append({
                            "speaker": entry.get("speaker", ""),
                            "title": entry.get("title", ""),
                            "content": entry.get("content", "")[:500] + "..." if len(
                                entry.get("content", "")) > 500 else entry.get("content", "")
                        })

            # Create enhanced prompt with financial context
            enhanced_prompt = f"""
You are an expert financial analyst specializing in analyzing earnings call transcripts with financial context. 
Analyze this {quarter} earnings call for {symbol} in conjunction with their financial data to provide a comprehensive investment perspective.

### Financial Context ###
{financial_summary}

### Earnings Call Overview ###
Company: {symbol}
Quarter: {quarter}

### Key Executive Statements ###
{exec_statements[:3]}  # Limiting to first 3 statements to keep prompt manageable

### Instructions ###
1. Analyze how the earnings call statements align with or differ from the financial reality shown in the data:
   - Are executives accurately representing the company's financial performance?
   - Do their forward-looking statements seem reasonable given the financial metrics?
   - Are there any discrepancies between management's narrative and the financial data?

2. Identify key financial strengths and weaknesses based on both the call and financial data:
   - Current financial health (profitability, liquidity, solvency)
   - Growth trends and their sustainability
   - Areas of financial concern that need monitoring

3. Analyze insider transaction patterns and what they might signal:
   - Are insiders buying or selling? What might this indicate?
   - How does this relate to management's public statements?

4. Provide an investment perspective that integrates both earnings call and financial data:
   - Key takeaways for investors
   - Risk assessment based on both qualitative and quantitative factors
   - Potential catalysts or warning signs to watch

5. Include a summary assessment (2-3 sentences) that captures the most important insights from this integrated analysis.

Ensure your analysis is balanced, objective, and focused on the interplay between management's narrative and the company's financial reality.
"""

            # Call OpenAI with the enhanced prompt
            enhanced_analysis = await self.openai.generate_analysis(enhanced_prompt)

            # Save both the original and enhanced analysis
            analysis_result["original_analysis"] = analysis_result["primary_analysis"]
            analysis_result["primary_analysis"] = enhanced_analysis
            analysis_result["includes_financial_context"] = True

            return analysis_result
        except Exception as e:
            logger.error(f"Error enhancing analysis with financials: {e}")
            # If anything goes wrong, return the original analysis
            return analysis_result