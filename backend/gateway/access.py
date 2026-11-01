"""Authorization at the only published port; service ports stay private."""
import os
from uuid import UUID
from fastapi import HTTPException
from jose import jwt, JWTError


def principal(request):
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    try:
        if scheme.lower() != "bearer":
            raise ValueError()
        claims = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        UUID(claims["sub"])
        if claims.get("token_type") != "access":
            raise ValueError()
        return claims
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(401, "Valid access token required")


async def json_body(request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError()
        return body
    except (ValueError, TypeError):
        raise HTTPException(400, "A JSON object is required")


async def authorize(request, service, path, client):
    path = path.strip("/")
    method = request.method
    if service == "event" and path.startswith("internal/"):
        raise HTTPException(403, "Internal access only")
    if service == "auth" and path in {"register", "login"}:
        return
    if service == "event" and method == "GET":
        # Public discovery is restricted to published events.
        if request.query_params.get("status", "published") != "published":
            claims = principal(request)
            if request.query_params.get("organizer_id") != claims["sub"]:
                raise HTTPException(403, "Private events require organizer ownership")
        return
    claims = principal(request)
    subject = claims["sub"]
    if service == "auth" and path == "me":
        return
    if service == "user":
        if path.split("/")[0] != subject:
            raise HTTPException(403, "You can access only your own profile")
        return
    if service in {"ticket", "ticketing"}:
        if method == "GET" and path == f"user/{subject}":
            return
        if method == "POST" and path in {"book", "issue", "waitlist/join"}:
            body = await json_body(request)
            if body.get("user_id") == subject:
                return
        raise HTTPException(403, "You can manage only your own bookings")
    if service == "event":
        if path in {"ingest", "ingest-city"}:
            raise HTTPException(403, "Ingestion is internal only")
        body = await json_body(request)
        if not path and method == "POST":
            if body.get("organizer_id") != subject:
                raise HTTPException(403, "Organizer identity mismatch")
            profile = await client.get(f"{os.getenv('USER_SERVICE_URL', 'http://user:8002')}/users/{subject}/organizer")
            if profile.status_code != 200:
                raise HTTPException(403, "Organizer onboarding required")
            return
        if method == "PATCH":
            response = await client.get(f"{os.getenv('EVENT_SERVICE_URL', 'http://event:8003')}/events/{path}")
            if response.status_code != 200:
                raise HTTPException(response.status_code, "Event unavailable")
            if response.json().get("organizer_id") == subject:
                return
        if method == "POST" and path.endswith("/chat") and body.get("user_id") == subject:
            return
    raise HTTPException(403, "This service or operation is unavailable")
