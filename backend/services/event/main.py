import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.event_endpoints import router as event_router
from app.api.chat_endpoint import router as chat_router
from app.db.session import engine
from app.models.event import Base
from app.core.config import settings

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="Event Management & Discovery Service for Biswa Event Platform",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
)

# CORS middleware for Flutter Web interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(event_router)
app.include_router(chat_router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=settings.DEBUG
    )
