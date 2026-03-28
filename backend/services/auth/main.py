import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth_endpoints import router as auth_router
from app.db.session import engine, Base
from app.core.config import settings

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="Identity and Access Management Service for Biswa Event Platform",
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

# Include Authentication Router
app.include_router(auth_router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG
    )
