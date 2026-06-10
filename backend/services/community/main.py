import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.community_endpoints import router as community_router
from app.db.session import engine
from app.models.community import Base
from app.core.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="Community Management Service for EventMind",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(community_router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8011,
        reload=settings.DEBUG,
    )
