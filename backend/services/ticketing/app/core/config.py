from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "ticketing-service"
    PORT: int = 8004
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Redis (For seat locking & waitlisting)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
