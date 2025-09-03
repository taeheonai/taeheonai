import os
import logging
from typing import List, Optional
from app.gmail_send import gmail_send

logger = logging.getLogger(__name__)

class GmailService:
    def __init__(self):
        self.user_email = os.getenv('GMAIL_USER_EMAIL')
        if not self.user_email:
            logger.warning("GMAIL_USER_EMAIL 환경변수가 설정되지 않았습니다.")
    
    def send_email(self, to_emails: List[str], subject: str, body: str, is_html: bool = True) -> bool:
        """이메일 발송"""
        if not self.user_email:
            logger.error("GMAIL_USER_EMAIL 환경변수가 설정되지 않았습니다.")
            return False
        
        success_count = 0
        total_count = len(to_emails)
        
        for to_email in to_emails:
            try:
                if is_html:
                    msg_id = gmail_send(to_email, subject, body, None)
                else:
                    msg_id = gmail_send(to_email, subject, None, body)
                
                logger.info(f"이메일 발송 성공: {to_email} (Message ID: {msg_id})")
                success_count += 1
                
            except Exception as e:
                logger.error(f"이메일 발송 실패 ({to_email}): {str(e)}")
        
        logger.info(f"이메일 발송 완료: {success_count}/{total_count} 성공")
        return success_count > 0
    
    def send_survey_email(self, to_emails: List[str], survey_url: str, company_name: str, survey_title: str) -> bool:
        """설문 이메일 발송"""
        subject = f"[{company_name}] {survey_title} 참여 요청"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    {survey_title}
                </h2>
                
                <p>안녕하세요,</p>
                
                <p><strong>{company_name}</strong>에서 진행하는 {survey_title}에 참여해 주시기 바랍니다.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c3e50; margin-top: 0;">설문 참여 방법</h3>
                    <p>아래 버튼을 클릭하거나 링크를 복사하여 브라우저에 붙여넣기 하세요.</p>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{survey_url}" 
                           style="background-color: #3498db; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; font-weight: bold;
                                  display: inline-block;">
                            설문 참여하기
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        링크: <a href="{survey_url}" style="color: #3498db;">{survey_url}</a>
                    </p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="color: #27ae60; margin-top: 0;">📋 설문 안내</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>설문은 중대성 평가를 위한 중요도 조사입니다</li>
                        <li>각 항목에 대해 1-5점으로 평가해 주세요</li>
                        <li>소요 시간: 약 10-15분</li>
                        <li>응답은 익명으로 처리됩니다</li>
                    </ul>
                </div>
                
                <p>참여해 주셔서 감사합니다.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                    이 이메일은 {company_name}에서 발송되었습니다.<br>
                    문의사항이 있으시면 담당자에게 연락해 주세요.
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_emails, subject, html_body, is_html=True)

# 전역 인스턴스
gmail_service = GmailService()