import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.user_endpoints import router as user_router
from app.api.organizer_endpoints import router as organizer_router
from app.api.community_endpoints import router as community_router
from app.db.session import engine
from app.models.user_profile import Base as UserBase
from app.models.organizer_profile import Base as OrganizerBase
from app.models.community import Base as CommunityBase
from app.core.config import settings

# Initialize database tables
UserBase.metadata.create_all(bind=engine)
OrganizerBase.metadata.create_all(bind=engine)
CommunityBase.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="User Profile & Preferences Management for Biswa Event Platform",
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
app.include_router(user_router)
app.include_router(organizer_router)
app.include_router(community_router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": settings.SERVICE_NAME}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=settings.DEBUG
    )
