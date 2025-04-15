from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import uvicorn
import os
from pydantic import BaseModel
from server.services.openai_options import router as openai_options_router
from server.api.routes import stocks, indicators, options, correlation, transcripts, settings, binance
from server.config.settings import get_settings

# Initialize FastAPI app
app = FastAPI(
    title="Financial Intelligence Hub API",
    description="API for financial market data analysis",
    version="1.0.0",
)

# Define API key response model
class ApiKeyResponse(BaseModel):
    apiKey: str

# Set up Jinja2 templates
templates = Jinja2Templates(directory="client/templates")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stocks.router)
app.include_router(indicators.router)
app.include_router(options.router)
app.include_router(correlation.router)
app.include_router(transcripts.router)
app.include_router(settings.router)
app.include_router(openai_options_router)
app.include_router(binance.router)  # Add the new Binance router



# Mount static files
app.mount("/static", StaticFiles(directory="client/static"), name="static")

# Serve the main index.html at the root, using Jinja2 template rendering
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Add OpenAI API key endpoint directly to the app
@app.get("/api/config/openai-key", response_model=ApiKeyResponse)
async def get_openai_api_key():
    """Return the OpenAI API key from environment variables"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise Exception("OPENAI_API_KEY environment variable not set")
    return {"apiKey": api_key}

if __name__ == "__main__":
    config = get_settings()
    uvicorn.run("server.app:app", host="0.0.0.0", port=config.PORT, reload=True)