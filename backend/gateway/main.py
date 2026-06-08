import httpx
import logging
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
from typing import Dict

# Setup Logging & Rate Limiting
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Biswa API Gateway", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Policy (Global entry point)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service Map (Internal Docker bridge addresses if using Docker)
SERVICE_MAP: Dict[str, str] = {
    "auth": "http://localhost:8001/auth",
    "user": "http://localhost:8002/users",
    "community": "http://localhost:8002/users/communities",
    "event": "http://localhost:8003/events",
    "ticket": "http://localhost:8004/tickets",
    "ticketing": "http://localhost:8004/tickets",
    "payment": "http://localhost:8005/payments",
    "notification": "http://localhost:8006/notifications",
    "chat": "http://localhost:8007/chat",
    "recommendation": "http://localhost:8008/recommendations",
    "review": "http://localhost:8009/reviews",
}

# Shared HTTP Client for Proxying
client = httpx.AsyncClient()

@app.on_event("shutdown")
async def shutdown_event():
    await client.aclose()

@app.api_route("/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@limiter.limit("60/minute") # Global Rate Limit
async def gateway_proxy(service_name: str, path: str, request: Request):
    """
    Standardized Proxy Gateway.
    Routes incoming /service/path requests to internal internal_service_url/path.
    """
    if service_name not in SERVICE_MAP:
        raise HTTPException(status_code=404, detail=f"Service '{service_name}' not found.")

    target_url = f"{SERVICE_MAP[service_name]}/{path}"
    
    # 1. Forward original query parameters
    params = dict(request.query_params)
    
    # 2. Forward original body
    body = await request.body()
    
    # 3. Forward original headers (excluding internal proxy headers)
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    try:
        response = await client.request(
            method=request.method,
            url=target_url,
            params=params,
            content=body,
            headers=headers,
            timeout=30.0
        )
        
        # Return matched response to the client
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers)
        )

    except httpx.RequestError as e:
        logger.error(f"Error proxying to {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Internal service {service_name} is unreachable."
        )

@app.get("/")
def health_check():
    return {"status": "ok", "message": "API Gateway is operational."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
