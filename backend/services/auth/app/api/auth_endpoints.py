from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user_credentials import UserCredentials, UserRole
from app.schemas.auth_schemas import UserRegister, UserLogin, Token, AuthResponse, UserMinOut, SocialLogin
from app.services.auth_service import AuthService
from app.core.config import settings
from backend.shared.kafka_utils import KafkaManager
import logging

router = APIRouter(prefix="/auth", tags=["Authentication"])

logger = logging.getLogger(__name__)

# Initialize Kafka Manager for events
kafka_manager = KafkaManager(
    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS, 
    client_id="auth-service-producer"
)

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.query(UserCredentials).filter(UserCredentials.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # 2. Hash password and create user credentials
    new_user = UserCredentials(
        email=user_in.email,
        hashed_password=AuthService.get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Publish 'UserCreated' event (Loose Coupling)
    logger.info(f"User created: {new_user.id}, publishing to Kafka...")
    
    # Run publishing as a background task to not block the response
    # In a real-world scenario, you might want to ensure transactional outbox pattern
    event_data = {
        "user_id": str(new_user.id),
        "full_name": user_in.full_name,
        "email": user_in.email,
        "role": str(new_user.role)
    }
    
    # but for now, we'll try sending the event directly
    background_tasks.add_task(kafka_manager.send, "user.created", event_data)

    return AuthResponse(msg="User registered successfully", user_id=new_user.id)

@router.post("/login", response_model=Token)
def login_user(form_data: UserLogin, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = db.query(UserCredentials).filter(UserCredentials.email == form_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Verify password
    if not AuthService.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Create tokens
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": str(user.role)}
    )
    refresh_token = AuthService.create_refresh_token(
        data={"sub": str(user.id)}
    )

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/social-login", response_model=Token)
def social_login(social_in: SocialLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = db.query(UserCredentials).filter(UserCredentials.email == social_in.email).first()
    
    if not user:
        # Create new user if not exist (similar to register)
        user = UserCredentials(
            email=social_in.email,
            hashed_password=AuthService.get_password_hash("SOCIAL_AUTH_PROVIDER_NO_PWD"),
            role=UserRole.USER,
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Publish UserCreated event for social user
        event_data = {
            "user_id": str(user.id),
            "full_name": social_in.full_name,
            "email": social_in.email,
            "role": str(user.role),
            "provider": social_in.provider
        }
        background_tasks.add_task(kafka_manager.send, "user.created", event_data)

    # 2. Create tokens
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": str(user.role)}
    )
    refresh_token = AuthService.create_refresh_token(
        data={"sub": str(user.id)}
    )

    return Token(access_token=access_token, refresh_token=refresh_token)

# Protected route example
@router.get("/me", response_model=UserMinOut)
def get_current_user(token: str, db: Session = Depends(get_db)):
    payload = AuthService.decode_token(token)
    if not payload:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user_id = payload.get("sub")
    user = db.query(UserCredentials).filter(UserCredentials.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user
