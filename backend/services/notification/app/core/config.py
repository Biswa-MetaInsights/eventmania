from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "notification-service"
    PORT: int = 8006
    DEBUG: bool = True

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_USER_CREATED: str = "user.created"
    KAFKA_TOPIC_TICKET_ISSUED: str = "ticket.issued"
    KAFKA_TOPIC_PAYMENT_FAILED: str = "payment.failed"

    # API Keys & Email
    SENDGRID_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    FROM_EMAIL: str = "no-reply@biswaevents.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
