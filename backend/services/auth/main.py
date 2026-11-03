import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth_endpoints import router as auth_router
from app.api.recovery import router as recovery_router
from app.db.session import engine, Base
from app.core.config import settings

# Initialize database tables
Base.metadata.create_all(bind=engine)
from backend.shared.migrations import add_columns
add_columns(engine, 'users_credentials', {'token_version': 'INTEGER NOT NULL DEFAULT 0'})

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
app.include_router(recovery_router)
app.include_router(auth_router)

@app.on_event("startup")
async def startup_event():
    from app.api.auth_endpoints import kafka_manager
    await kafka_manager.start()
    from backend.shared.periodic import start
    from app.api.recovery import send_pending
    app.state.mail_worker = start(send_pending)

@app.on_event('shutdown')
def stop_mail_worker():
    if hasattr(app.state, 'mail_worker'): app.state.mail_worker.set()

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
