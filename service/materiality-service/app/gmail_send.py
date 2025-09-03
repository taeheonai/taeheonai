import base64
import os
from email.message import EmailMessage
from typing import Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

def _env(n): 
    return os.getenv(n)

def build_gmail_service():
    client_id = _env("GMAIL_CLIENT_ID")
    client_secret = _env("GMAIL_CLIENT_SECRET")
    refresh_token = _env("GMAIL_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError("Gmail OAuth env missing: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN")
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)

def create_raw(sender: str, to: str, subject: str, html: Optional[str] = None, text: Optional[str] = None) -> str:
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    if html and text:
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
    elif html:
        msg.set_content("HTML 미지원 클라이언트용 텍스트")
        msg.add_alternative(html, subtype="html")
    else:
        msg.set_content(text or "")
    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

def gmail_send(to: str, subject: str, html: Optional[str], text: Optional[str]):
    sender = _env("GMAIL_USER_EMAIL")
    if not sender:
        raise RuntimeError("GMAIL_USER_EMAIL is missing")
    svc = build_gmail_service()
    raw = create_raw(sender, to, subject, html, text)
    resp = svc.users().messages().send(userId="me", body={"raw": raw}).execute()
    return resp.get("id")
