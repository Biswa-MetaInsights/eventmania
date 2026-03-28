import logging
from app.core.config import settings
from jinja2 import Environment, FileSystemLoader
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from typing import Optional, Dict, Any
import os

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        # Initialize Jinja2 for templates
        template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
        self.jinja_env = Environment(loader=FileSystemLoader(template_dir))
        
        # Initialize API Clients (Mocked if keys are missing)
        self.sg_client = SendGridAPIClient(settings.SENDGRID_API_KEY) if settings.SENDGRID_API_KEY else None

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Renders a dynamic HTML/Text content using Jinja templates.
        """
        template = self.jinja_env.get_project_template(template_name)
        return template.render(context)

    async def send_email(self, to_email: str, subject: str, template_name: str, context: Dict[str, Any]):
        """
        Sends an HTML email to the user.
        """
        if not self.sg_client:
            logger.warning(f"SIMULATED EMAIL to {to_email}: {subject} | Template: {template_name}")
            return

        html_content = self._render_template(template_name, context)
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        try:
            response = self.sg_client.send(message)
            logger.info(f"Email sent to {to_email}. Status: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    async def send_sms(self, to_number: str, text: str):
        """
        Sends an SMS alert via Twilio.
        """
        # Placeholder for Twilio integration
        logger.info(f"SIMULATED SMS to {to_number}: {text}")

# Initialize singleton
notification_service = NotificationService()
