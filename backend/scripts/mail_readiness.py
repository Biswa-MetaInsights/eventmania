"""Validate NewFind's production SMTP connection without sending messages."""
import argparse
import json
import os
import smtplib
import ssl
from urllib.parse import urlsplit
from operations_config import ROOT,load


def check():
    names=('SMTP_HOST','SMTP_FROM','SMTP_USERNAME','SMTP_PASSWORD')
    missing=[name for name in names if not os.getenv(name)]
    if missing:return {'ready':False,'missing':missing,'message':'Production sender credentials are required'}
    public=urlsplit(os.getenv('APP_PUBLIC_URL','https://newfind-khaki.vercel.app'))
    if public.scheme!='https' or not public.hostname:return {'ready':False,'message':'Public application URL must use HTTPS'}
    try:
        port=int(os.getenv('SMTP_PORT','587'))
        if port not in (465,587):return {'ready':False,'message':'Use authenticated TLS submission on port 465 or 587'}
        transport=smtplib.SMTP_SSL if port==465 else smtplib.SMTP
        arguments={'timeout':10}
        if port==465:arguments['context']=ssl.create_default_context()
        with transport(os.environ['SMTP_HOST'],port,**arguments) as smtp:
            if port==587:smtp.starttls(context=ssl.create_default_context())
            smtp.login(os.environ['SMTP_USERNAME'],os.environ['SMTP_PASSWORD'])
        return {'ready':True,'message':'TLS and sender authentication passed; actual inbox delivery is not yet verified'}
    except (OSError,smtplib.SMTPException,ValueError):
        return {'ready':False,'message':'SMTP TLS/authentication failed; inspect account settings privately'}


if __name__=='__main__':
    load();result=check();print(json.dumps(result));raise SystemExit(0 if result['ready'] else 1)
