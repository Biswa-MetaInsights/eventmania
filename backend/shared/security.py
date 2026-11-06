"""Identity and internal-service guards shared by the core services."""
import os
import secrets
from uuid import UUID
from fastapi import Header, HTTPException
import jwt
from jwt import InvalidTokenError as JWTError


def identity(authorization: str = Header("")):
    scheme, _, token = authorization.partition(" ")
    try:
        if scheme.lower() != "bearer":
            raise ValueError()
        claims = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        UUID(claims["sub"])
        if claims.get("token_type") != "access":
            raise ValueError()
        return claims
    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(401, "Please sign in again")


def internal(x_internal_key: str = Header("")):
    expected = os.getenv("INTERNAL_API_KEY", "")
    if not expected or not secrets.compare_digest(expected, x_internal_key):
        raise HTTPException(403, "Internal access only")

