import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.event_endpoints import router as event_router
from app.api.workspace import router as workspace_router
from app.api.chat_endpoint import router as chat_router
from app.db.session import engine
from app.models.event import Base
from app.core.config import settings

# Initialize database tables
Base.metadata.create_all(bind=engine)
from backend.shared.migrations import add_columns
from sqlalchemy import text
add_columns(engine, 'events', {
    'organizer_content': "JSON NOT NULL DEFAULT '{}'",
    'visibility': "VARCHAR(20) NOT NULL DEFAULT 'public'",
    'timezone': "VARCHAR(100) NOT NULL DEFAULT 'UTC'",
    'previous_start_date': 'TIMESTAMP NULL',
})
if engine.dialect.name == 'postgresql':
    with engine.connect().execution_options(isolation_level='AUTOCOMMIT') as connection:
        connection.execute(text("ALTER TYPE eventstatus ADD VALUE IF NOT EXISTS 'REGISTRATION_CLOSED'"))

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
app.include_router(workspace_router)
app.include_router(event_router)
app.include_router(chat_router)

@app.on_event('startup')
def start_delivery():
    from backend.shared.periodic import start
    from app.api.workspace import send_event_mail
    app.state.mail_worker=start(send_event_mail)

@app.on_event('shutdown')
def stop_delivery():
    if hasattr(app.state,'mail_worker'):app.state.mail_worker.set()

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
