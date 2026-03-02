import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from datetime import datetime

# Set up logging for fallback when SMTP is not configured
logger = logging.getLogger(__name__)

SMTP_SERVER = os.getenv('SMTP_SERVER', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'billing@citycarehospital.com')

def send_insurance_claim_request(
    provider_email: str,
    provider_name: str,
    patient_name: str,
    patient_id: str,
    policy_number: str,
    claim_amount: float,
    hospital_name: str = "CityCare Hospital"
) -> bool:
    """
    Sends an insurance claim request email to the provider.
    If SMTP variables are not fully configured, it simulates a successful send via logging.
    """
    subject = f"Urgent: New Insurance Claim Request - {patient_name} ({policy_number})"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Dear {provider_name} Claims Department,</p>
            <p>This is an official claim request from <strong>{hospital_name}</strong>.</p>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 20px; border: 1px solid #ddd;">
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;" colspan="2">Claim Details</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Patient Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{patient_name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Patient ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{patient_id}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Policy Number:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{policy_number}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Claim Amount Requested:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #d97706;">₹{claim_amount:,.2f}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date of Request:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</td>
                </tr>
            </table>

            <p style="margin-top: 20px;">Please review this claim and update our billing department with the approved amount at your earliest convenience.</p>
            <p>Thank you,</p>
            <p><strong>Billing Department</strong><br>{hospital_name}</p>
        </body>
    </html>
    """

    if not all([SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD]):
        logger.info(f"--- SIMULATED EMAIL SEND ---")
        logger.info(f"To: {provider_email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body:\n{html_content}")
        logger.info(f"----------------------------")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = provider_email

        part = MIMEText(html_content, 'html')
        msg.attach(part)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {provider_email}: {str(e)}")
        return False
