import openai
from server.config import get_settings, get_logger
from tenacity import retry, stop_after_attempt, wait_exponential

logger = get_logger(__name__)


class OpenAIService:
    """Service for OpenAI API operations"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.OPENAI_API_KEY
        openai.api_key = self.api_key

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_analysis(self, prompt: str) -> str:
        """
        Generate analysis text using OpenAI API

        Args:
            prompt: The prompt to send to OpenAI

        Returns:
            Generated analysis text
        """
        try:
            # Set up the client
            client = openai.OpenAI(api_key=self.api_key)

            # Call the API
            response = client.chat.completions.create(
                model="gpt-4",  # Use an appropriate model
                messages=[
                    {"role": "system",
                     "content": "You are a financial analyst specializing in earnings call analysis."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )

            # Extract the response text
            analysis = response.choices[0].message.content.strip()

            return analysis
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            # Re-raise for retry logic
            raise