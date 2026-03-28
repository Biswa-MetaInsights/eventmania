from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "payment-service"
    PORT: int = 8005
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
