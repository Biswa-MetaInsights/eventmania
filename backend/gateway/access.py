"""Authorization at the only published port; service ports stay private."""
import os
from uuid import UUID
from fastapi import HTTPException
import jwt
from jwt import InvalidTokenError as JWTError


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


async def verified_principal(request, client):
    claims = principal(request)
    try:
        response = await client.get(os.getenv('BACKEND_AUTH_URL', 'http://auth:8001/auth') + '/me', headers={'Authorization': request.headers.get('authorization', '')}, timeout=5)
    except Exception:
        raise HTTPException(503, 'Identity service is temporarily unavailable')
    if response.status_code != 200:
        raise HTTPException(401, 'Please sign in again')
    return claims


async def authorize(request, service, path, client):
    path = path.strip("/")
    method = request.method
    if service == "event" and path.startswith("internal/"):
        raise HTTPException(403, "Internal access only")
    if service == 'community':
        if path.startswith('internal/'): raise HTTPException(403, 'Internal access only')
        if method == 'GET' and not path.endswith('/members/me'): return
        await verified_principal(request, client)
        return
    if service == "auth" and path in {"register", "login", "capabilities", "forgot-password", "reset-password", "verify-email", "social-login"}:
        return
    if service == 'event' and (path.startswith('notifications') or path in {'rooms','recommendations'} or '/messages' in path or path.endswith('/announcements')):
        await verified_principal(request, client)
        return
    if service == "event" and method == "GET":
        # Public discovery is restricted to published events.
        if request.query_params.get("status", "published") not in {"published", "registration_closed"}:
            claims = await verified_principal(request, client)
            if request.query_params.get("organizer_id") != claims["sub"]:
                raise HTTPException(403, "Private events require organizer ownership")
        return
    if service == "user" and method == "GET":
        if path.startswith('assets/'):
            return
        parts = path.split("/")
        if len(parts) == 3 and parts[1:] == ["organizer", "public"]:
            try:
                UUID(parts[0])
            except ValueError:
                raise HTTPException(422, "Invalid organizer identity")
            return
    claims = await verified_principal(request, client)
    subject = claims["sub"]
    if service == "auth" and path in {"me", "request-verification"}:
        return
    if service == "user":
        if path.split("/")[0] != subject:
            raise HTTPException(403, "You can access only your own profile")
        return
    if service in {"ticket", "ticketing"}:
        if path.startswith('organizer/') or path.startswith('check-in/') or path.startswith('qr/') or path.startswith('checkout/') or path.startswith('refunds/'):
            return
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
            response = await client.get(f"{os.getenv('EVENT_SERVICE_URL', 'http://event:8003')}/events/{path}", headers={"Authorization": request.headers.get("authorization", "")})
            if response.status_code != 200:
                raise HTTPException(response.status_code, "Event unavailable")
            if response.json().get("organizer_id") == subject:
                return
        if method == "POST" and path.endswith("/chat") and body.get("user_id") == subject:
            return
    raise HTTPException(403, "This service or operation is unavailable")
