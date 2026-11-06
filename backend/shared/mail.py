"""TLS SMTP transport. No credentials, addresses or message bodies are logged."""
import os
import smtplib
import ssl
from email.message import EmailMessage


def ready():
    return bool(os.getenv('SMTP_HOST') and os.getenv('SMTP_FROM') and os.getenv('APP_PUBLIC_URL'))


def test_transport():
    return os.getenv('SMTP_HOST') in ('127.0.0.1','localhost') and os.getenv('SMTP_LOCAL_TEST')=='true'


def deliverable(recipient):
    from email.utils import parseaddr
    address=parseaddr(recipient)[1]
    domain=address.rpartition('@')[2].casefold()
    reserved=domain in ('example.com','example.org','example.net','localhost') or domain.endswith(('.invalid','.test','.localhost'))
    return bool(address and '@' in address and (not reserved or test_transport()))


def send(recipient, subject, body):
    if not deliverable(recipient):raise ValueError('Reserved test recipients are not sent to a production mail server')
    msg = EmailMessage()
    msg['From'], msg['To'], msg['Subject'] = os.environ['SMTP_FROM'], recipient, subject
    msg.set_content(body)
    host, port = os.environ['SMTP_HOST'], int(os.getenv('SMTP_PORT', '587'))
    local = test_transport()
    transport = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
    with transport(host, port, timeout=10) as smtp:
        if port != 465 and not local: smtp.starttls(context=ssl.create_default_context())
        if os.getenv('SMTP_USERNAME'): smtp.login(os.environ['SMTP_USERNAME'], os.environ['SMTP_PASSWORD'])
        smtp.send_message(msg)
