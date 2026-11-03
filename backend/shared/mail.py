"""TLS SMTP transport. No credentials, addresses or message bodies are logged."""
import os
import smtplib
import ssl
from email.message import EmailMessage


def ready():
    return bool(os.getenv('SMTP_HOST') and os.getenv('SMTP_FROM') and os.getenv('APP_PUBLIC_URL'))


def send(recipient, subject, body):
    msg = EmailMessage()
    msg['From'], msg['To'], msg['Subject'] = os.environ['SMTP_FROM'], recipient, subject
    msg.set_content(body)
    host, port = os.environ['SMTP_HOST'], int(os.getenv('SMTP_PORT', '587'))
    local = host in ('127.0.0.1', 'localhost') and os.getenv('SMTP_LOCAL_TEST') == 'true'
    transport = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
    with transport(host, port, timeout=10) as smtp:
        if port != 465 and not local: smtp.starttls(context=ssl.create_default_context())
        if os.getenv('SMTP_USERNAME'): smtp.login(os.environ['SMTP_USERNAME'], os.environ['SMTP_PASSWORD'])
        smtp.send_message(msg)
