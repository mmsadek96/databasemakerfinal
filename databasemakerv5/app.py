from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from server.api.routes import stocks, indicators, options, correlation, transcripts, settings
from server.config.settings import get_settings

# Initialize FastAPI app
app = FastAPI(
    title="Financial Intelligence Hub API",
    description="API for financial market data analysis",
    version="1.0.0",
)

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

# Mount static files
app.mount("/static", StaticFiles(directory="client/static"), name="static")

# Serve the main index.html at the root
@app.get("/")
async def get_index():
    # Redirect to static index.html
    return {"url": "/static/index.html"}

if __name__ == "__main__":
    config = get_settings()
    uvicorn.run("server.app:app", host="0.0.0.0", port=config.PORT, reload=True)