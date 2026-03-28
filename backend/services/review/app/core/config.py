from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "review-service"
    PORT: int = 8009
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Internal Microservice Links
    TICKETING_SERVICE_URL: str = "http://localhost:8004"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
