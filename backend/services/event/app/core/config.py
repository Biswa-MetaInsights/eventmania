from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "event-service"
    PORT: int = 8003
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    # Redis (For caching)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # AI & internal services
    OPENAI_API_KEY: Optional[str] = None
    TICKETING_SERVICE_URL: str = "http://localhost:8004"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
