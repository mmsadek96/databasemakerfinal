# server/services/openai_options.py
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, List
from openai import OpenAI
from datetime import datetime
import json
import traceback
import os
from server.config import get_settings, get_logger

# Create a router for the options analysis endpoint
router = APIRouter(prefix="/api/analyze/options", tags=["analysis"])
logger = get_logger(__name__)


# Define request and response models
class OptionsAnalysisRequest(BaseModel):
    """Request model for options analysis"""
    symbol: str
    stockPrice: float
    expirationDate: str
    calculationResults: List[Dict[str, Any]]
    optionsData: Dict[str, List[Dict[str, Any]]]


class OptionsAnalysisResponse(BaseModel):
    """Response model for options analysis"""
    summary: str
    marketOutlook: str
    strategies: List[Dict[str, str]]
    risks: List[str]
    contrarian: str


class OpenAIOptionsService:
    """Service for analyzing options data using OpenAI"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.OPENAI_API_KEY
        self.client = OpenAI(api_key=self.api_key)

    async def analyze_options(self,
                              symbol: str,
                              stock_price: float,
                              expiration_date: str,
                              calculation_results: List[Dict[str, Any]],
                              options_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Analyze options data using OpenAI

        Args:
            symbol: Stock symbol
            stock_price: Current stock price
            expiration_date: Expiration date
            calculation_results: Results from options calculations
            options_data: Options data for current expiration

        Returns:
            Dictionary containing analysis and suggestions
        """
        try:
            # EXTENSIVE DATA LOGGING
            logger.info(f"===== ANALYZING OPTIONS DATA =====")
            logger.info(f"Symbol: {symbol}")
            logger.info(f"Stock Price: {stock_price}")
            logger.info(f"Expiration Date: {expiration_date}")

            # Log calculation results
            logger.info(f"Total calculation results: {len(calculation_results)}")
            for i, result in enumerate(calculation_results):
                logger.info(f"Calculation Result #{i + 1}:")
                logger.info(f"  Type: {result.get('type', 'unknown')}")
                logger.info(f"  Title: {result.get('title', 'unknown')}")
                if 'data' in result:
                    logger.info(f"  Data items count: {len(result['data'])}")
                    for j, item in enumerate(result['data'][:3]):  # Log first 3 items
                        logger.info(f"    Data Item #{j + 1}: {item}")
                    if len(result['data']) > 3:
                        logger.info(f"    ... and {len(result['data']) - 3} more items")

            # Log options data
            call_count = len(options_data.get('calls', []))
            put_count = len(options_data.get('puts', []))
            logger.info(f"Options data: {call_count} calls, {put_count} puts")

            if call_count > 0:
                logger.info(f"Sample call option: {json.dumps(options_data['calls'][0], indent=2)}")
            if put_count > 0:
                logger.info(f"Sample put option: {json.dumps(options_data['puts'][0], indent=2)}")

            # Format the calculation results for the prompt
            formatted_results = self.format_calculation_results(calculation_results)

            # Calculate days to expiration
            try:
                exp_date = datetime.strptime(expiration_date, '%Y-%m-%d')
                today = datetime.now()
                days_to_expiration = (exp_date - today).days
                logger.info(f"Days to expiration: {days_to_expiration}")
            except Exception as date_error:
                logger.error(f"Error calculating days to expiration: {date_error}")
                days_to_expiration = 30  # Default fallback
                logger.info(f"Using fallback days to expiration: {days_to_expiration}")

            # Create the prompt for OpenAI
            prompt = f"""
Analyze the following options data for {symbol} with expiration on {expiration_date} ({days_to_expiration} days from now) and provide trading suggestions.

Current stock price: ${stock_price:.2f}

## Options Analytics Summary:
{formatted_results}

## Request:
Based on this options data, please provide:

1. A brief market outlook for {symbol} based on the options metrics (implied volatility, skew, put-call ratio, etc.)
2. 3-4 specific options trading strategies that might be appropriate given this data, including specific strikes and expirations where relevant
3. Risk factors to consider
4. One contrarian perspective that goes against the prevailing sentiment in these options

Format your response as JSON with the following structure:
{{
  "summary": "A one-sentence summary of your analysis",
  "marketOutlook": "Paragraph describing what the options data suggests about market sentiment and expectations",
  "strategies": [
    {{
      "name": "Name of strategy",
      "description": "Detailed explanation with specific strikes, premiums, and potential returns"
    }},
    ...
  ],
  "risks": ["Risk factor 1", "Risk factor 2", ...],
  "contrarian": "The contrarian perspective"
}}

Be specific and quantitative where possible, mentioning exact strikes, premiums, and potential returns. Ensure your analysis is balanced, highlighting both potential rewards and risks.
"""
            # Log the full prompt
            logger.info("===== COMPLETE PROMPT TO OPENAI =====")
            logger.info(prompt)

            # Call the OpenAI API
            logger.info("Calling OpenAI API...")
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use a compatible model
                messages=[
                    {"role": "system",
                     "content": "You are a professional options trader with 20 years of experience. Provide analysis and trading suggestions based on options data."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )

            # Extract and log the full response
            analysis_text = response.choices[0].message.content
            logger.info("===== COMPLETE RESPONSE FROM OPENAI =====")
            logger.info(analysis_text)

            # Try to parse as JSON
            try:
                # Try direct JSON parsing
                analysis_data = json.loads(analysis_text)
                logger.info("Successfully parsed response as JSON")
            except json.JSONDecodeError as json_error:
                logger.warning(f"JSON parse error: {json_error}. Trying to extract JSON from text...")

                # Try to extract JSON from text (common with GPT responses)
                import re
                json_match = re.search(r'```json\s*({.*})\s*```|({.*})', analysis_text, re.DOTALL)

                if json_match:
                    json_str = json_match.group(1) or json_match.group(2)
                    try:
                        analysis_data = json.loads(json_str)
                        logger.info("Successfully extracted and parsed JSON from response")
                    except json.JSONDecodeError:
                        logger.error("Failed to parse extracted JSON")
                        # Create structured response from raw text
                        analysis_data = self.create_structured_response(symbol, analysis_text)
                else:
                    logger.error("No JSON pattern found in response")
                    # Create structured response from raw text
                    analysis_data = self.create_structured_response(symbol, analysis_text)

                    # Log the structured response for debugging
                    logger.info("===== STRUCTURED RESPONSE CREATED =====")
                    logger.info(json.dumps(analysis_data, indent=2))

            # Validate the analysis data has all required fields
            required_fields = ["summary", "marketOutlook", "strategies", "risks", "contrarian"]
            for field in required_fields:
                if field not in analysis_data:
                    logger.warning(f"Missing field in response: {field}")
                    if field == "strategies":
                        analysis_data[field] = [
                            {"name": "Generic Strategy", "description": "No specific strategies were provided."}]
                    elif field == "risks":
                        analysis_data[field] = ["No specific risks were provided."]
                    else:
                        analysis_data[field] = f"No {field} was provided."

            # Log the successful analysis
            logger.info(f"Successfully analyzed options data for {symbol}")

            return analysis_data

        except Exception as e:
            logger.error(f"Error analyzing options data: {e}")
            logger.error(traceback.format_exc())  # Log full traceback

            # Return a simplified error response
            return {
                "summary": f"Error analyzing {symbol} options",
                "marketOutlook": f"An error occurred while generating the analysis: {str(e)}",
                "strategies": [{"name": "Error", "description": f"Could not generate strategies: {str(e)}"}],
                "risks": ["Analysis unavailable due to technical error"],
                "contrarian": "No contrarian perspective available"
            }

    def create_structured_response(self, symbol: str, text: str) -> Dict[str, Any]:
        """Create a structured response from plain text"""
        logger.info("Creating structured response from raw text")

        # Try to identify different sections in the text
        sections = {
            "summary": "",
            "outlook": "",
            "strategies": [],
            "risks": [],
            "contrarian": ""
        }

        # Look for section headers in the text
        lines = text.split('\n')
        current_section = None
        buffer = []

        for line in lines:
            line = line.strip()
            lower_line = line.lower()

            # Check for section headers
            if "market outlook" in lower_line or "sentiment" in lower_line:
                if current_section:
                    sections[current_section] = '\n'.join(buffer)
                current_section = "outlook"
                buffer = []
            elif "strateg" in lower_line or "trade" in lower_line:
                if current_section:
                    sections[current_section] = '\n'.join(buffer)
                current_section = "strategies"
                buffer = []
            elif "risk" in lower_line or "caution" in lower_line:
                if current_section:
                    sections[current_section] = '\n'.join(buffer)
                current_section = "risks"
                buffer = []
            elif "contrarian" in lower_line or "alternative view" in lower_line:
                if current_section:
                    sections[current_section] = '\n'.join(buffer)
                current_section = "contrarian"
                buffer = []
            elif "summary" in lower_line:
                if current_section:
                    sections[current_section] = '\n'.join(buffer)
                current_section = "summary"
                buffer = []
            elif line and current_section:
                buffer.append(line)

        # Add the last section
        if current_section and buffer:
            sections[current_section] = '\n'.join(buffer)

        # If no sections were found, try a different approach
        if not any(sections.values()):
            paragraphs = text.split('\n\n')

            # First paragraph is likely a summary
            if paragraphs:
                sections["summary"] = paragraphs[0]

            # Second paragraph might be the outlook
            if len(paragraphs) > 1:
                sections["outlook"] = paragraphs[1]

            # Look for strategies and risks
            for i, para in enumerate(paragraphs[2:], 2):
                para_lower = para.lower()
                if "strategy" in para_lower or "trade" in para_lower:
                    sections["strategies"].append(para)
                elif "risk" in para_lower or "caution" in para_lower:
                    sections["risks"].append(para)
                elif "contrarian" in para_lower or "alternative" in para_lower:
                    sections["contrarian"] = para

        # Build structured response
        strategies = []
        if isinstance(sections["strategies"], list):
            for i, strat in enumerate(sections["strategies"][:3]):  # Limit to 3 strategies
                strategies.append({
                    "name": f"Strategy {i + 1}",
                    "description": strat
                })
        else:
            # If strategies is a string, try to split it into separate strategies
            strat_text = sections["strategies"]
            strat_parts = strat_text.split('\n\n')
            for i, strat in enumerate(strat_parts[:3]):
                strategies.append({
                    "name": f"Strategy {i + 1}",
                    "description": strat
                })

        # Process risks
        risks = []
        if isinstance(sections["risks"], list):
            risks = sections["risks"][:5]  # Limit to 5 risks
        else:
            # If risks is a string, split by sentences or bullet points
            risk_text = sections["risks"]

            # Try to split by bullet points
            if '•' in risk_text or '*' in risk_text or '-' in risk_text:
                for line in risk_text.split('\n'):
                    line = line.strip()
                    if line.startswith('•') or line.startswith('*') or line.startswith('-'):
                        clean_line = line.lstrip('•*- ').strip()
                        if clean_line:
                            risks.append(clean_line)
            else:
                # Split by sentences
                risk_sentences = risk_text.split('. ')
                risks = [s.strip() + '.' for s in risk_sentences if len(s) > 10][:5]

        # Create summary if missing
        if not sections["summary"]:
            sections["summary"] = f"Analysis for {symbol} options"

        # Create final response
        return {
            "summary": sections["summary"][:200],  # Limit to 200 chars
            "marketOutlook": sections["outlook"] if sections["outlook"] else (
                sections["summary"] if sections["summary"] else text[:500]),
            "strategies": strategies if strategies else [
                {"name": "Strategy", "description": "Could not extract specific strategies."}],
            "risks": risks[:5] if risks else ["No specific risks identified."],
            "contrarian": sections["contrarian"] if sections[
                "contrarian"] else "Could not extract contrarian perspective."
        }

    def format_calculation_results(self, calculations: List[Dict[str, Any]]) -> str:
        """Format calculation results for the prompt"""
        formatted = ''

        for result in calculations:
            formatted += f"### {result.get('title', 'Analysis')}:\n"

            for item in result.get('data', []):
                formatted += f"- {item.get('label', '')}: {item.get('value', '')}\n"

            formatted += '\n'

        return formatted


# Create a service instance for dependency injection
def get_openai_options_service():
    return OpenAIOptionsService()


# Add the endpoint
@router.post("", response_model=OptionsAnalysisResponse)
async def analyze_options(request: OptionsAnalysisRequest = Body(...)):
    """
    Analyze options data using OpenAI
    """
    try:
        # Log incoming request data
        logger.info(f"Received analysis request for {request.symbol}")

        # Create service and analyze options
        service = get_openai_options_service()
        analysis = await service.analyze_options(
            symbol=request.symbol,
            stock_price=request.stockPrice,
            expiration_date=request.expirationDate,
            calculation_results=request.calculationResults,
            options_data=request.optionsData
        )

        return analysis
    except Exception as e:
        err_msg = f"Error in analyze_options endpoint: {e}"
        logger.error(err_msg)
        logger.error(traceback.format_exc())  # Log full traceback
        raise HTTPException(status_code=500, detail=err_msg)