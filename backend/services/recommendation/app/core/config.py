from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "recommendation-service"
    PORT: int = 8008
    DEBUG: bool = True

    # Internal Microservice Links
    USER_SERVICE_URL: str = "http://localhost:8002"
    EVENT_SERVICE_URL: str = "http://localhost:8003"

    # Redis (For Caching Recommendations)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # AI Agent Config
    GOOGLE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    TICKETMASTER_API_KEY: Optional[str] = None
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
