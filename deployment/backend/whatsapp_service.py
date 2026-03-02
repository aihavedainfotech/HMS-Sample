"""
WhatsApp Integration Service for Hospital Management System
===========================================================
Handles WhatsApp messaging for patient notifications including:
- Patient registration confirmation
- Appointment booking confirmation
- Appointment approval confirmation
- Lab results notification
- Real-time status updates

VERSION 2.0 - Now with integrated message templates
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import logging
from queue import Queue
import threading
from enum import Enum

# Load environment variables from .env file
import os.path
from dotenv import load_dotenv

# Load from current directory or parent directories
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Import message templates
try:
    from WHATSAPP_MESSAGE_TEMPLATES import (
        TEMPLATE_REGISTRATION,
        TEMPLATE_APPOINTMENT_BOOKING_PENDING,
        TEMPLATE_APPOINTMENT_BOOKING_CONFIRMED,
        TEMPLATE_APPOINTMENT_APPROVED,
        TEMPLATE_APPOINTMENT_CANCELLED,
        TEMPLATE_CONSULTATION_COMPLETE,
        TEMPLATE_PRESCRIPTION_READY,
        TEMPLATE_LAB_RESULTS_READY,
        TEMPLATE_MEDICAL_RECORDS_AVAILABLE,
        TEMPLATE_PAYMENT_REMINDER,
        TEMPLATE_APPOINTMENT_REMINDER,
        TEMPLATE_DISCHARGE_SUMMARY,
        TEMPLATE_VACCINATION_RECORD,
        TEMPLATE_HEALTH_CHECKUP
    )
    TEMPLATES_AVAILABLE = True
    logger_init = logging.getLogger(__name__)
    logger_init.info("✓ Message templates imported successfully")
except ImportError as e:
    logger_init = logging.getLogger(__name__)
    logger_init.warning(f"Message templates not available (will use fallback messages): {e}")
    TEMPLATES_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WhatsApp Configuration
WHATSAPP_API_URL = os.getenv('WHATSAPP_API_URL', 'https://graph.facebook.com/v22.0')
WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')  # Your WhatsApp Business Account Phone ID
WHATSAPP_ACCESS_TOKEN = os.getenv('WHATSAPP_ACCESS_TOKEN', '')  # Your WhatsApp Business Account Token
BUSINESS_PHONE_NUMBER = os.getenv('BUSINESS_PHONE_NUMBER', '+1234567890')  # Your business WhatsApp number

# Message Types
class MessageType(Enum):
    REGISTRATION = "registration"
    APPOINTMENT_BOOKED = "appointment_booked"
    APPOINTMENT_APPROVED = "appointment_approved"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    LAB_RESULTS = "lab_results"
    APPOINTMENT_REMINDER = "appointment_reminder"
    CONSULTATION_COMPLETE = "consultation_complete"
    PRESCRIPTION_READY = "prescription_ready"
    PAYMENT_REMINDER = "payment_reminder"

# Message Queue for asynchronous processing
message_queue = Queue()
queue_worker_thread = None

def start_message_queue_worker():
    """Start the background worker thread for processing messages"""
    global queue_worker_thread
    try:
        if queue_worker_thread is None or not queue_worker_thread.is_alive():
            queue_worker_thread = threading.Thread(target=_process_message_queue, daemon=True)
            queue_worker_thread.start()
            logger.info("WhatsApp message queue worker started")
    except Exception as e:
        logger.warning(f"Failed to start WhatsApp queue worker: {e}")

def _process_message_queue():
    """Process messages from the queue in background"""
    from queue import Empty
    while True:
        try:
            message_data = message_queue.get(timeout=5)
            if message_data is None:
                break
            _send_whatsapp_message_internal(message_data)
        except Empty:
            # Queue timeout - this is expected behavior, continue waiting
            continue
        except Exception as e:
            logger.error(f"Error processing message queue: {e}")

def validate_phone_number(phone_number: str) -> str:
    """
    Validate and format phone number for WhatsApp
    WhatsApp requires: country code + phone number (e.g., 919876543210 for India, 15551562695 for US)
    Accepts multiple formats and standardizes to WhatsApp format
    """
    # Handle None or empty input
    if not phone_number:
        logger.warning(f"Empty phone number provided")
        return ""
    
    # Remove all non-digit characters
    phone = ''.join(c for c in str(phone_number) if c.isdigit())
    
    # Log the raw phone for debugging
    logger.info(f"Raw phone number input: {phone_number} -> Extracted digits: {phone}")
    
    # If no digits found, return empty
    if not phone:
        logger.warning(f"No digits found in phone number: {phone_number}")
        return ""

    # Normalize common prefixes:
    # - "00" international prefix (e.g., 0091...)
    if phone.startswith("00") and len(phone) > 12:
        phone = phone[2:]
        logger.info(f"Stripped 00 international prefix: {phone}")

    # Strip leading zeros when the number is likely a local number with trunk prefix
    # (E.164 numbers do not start with 0)
    while phone.startswith("0") and len(phone) > 10:
        phone = phone[1:]
        logger.info(f"Stripped leading 0 prefix: {phone}")
    
    # If the number is 10 digits, it's likely a local number without country code
    # We'll default to India (91) as per system requirement, but this logic can be adjusted
    if len(phone) == 10:
        phone = '91' + phone
        logger.info(f"10-digit number detected, assuming India (91): {phone}")
        return phone
    
    # If it's 11-15 digits, we assume it includes a country code
    # (E.164 standard allows up to 15 digits)
    if 11 <= len(phone) <= 15:
        logger.info(f"Number with potential country code detected: {phone}")
        return phone
    
    # If less than 10 digits, it's likely invalid for our purposes
    if len(phone) < 10:
        logger.warning(f"Phone number too short (<10 digits): {phone}")
        return ""
        
    # If more than 15 digits, it's too long
    if len(phone) > 15:
        logger.warning(f"Phone number too long (>15 digits): {phone}")
        return ""

    return phone

def _send_whatsapp_message_internal(message_data: Dict[str, Any]) -> bool:
    """
    Internal method to send WhatsApp message via Meta/WhatsApp Business API
    """
    try:
        logger.info(f"===== WHATSAPP MESSAGE SEND START =====")
        
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.error("WhatsApp credentials not configured. Cannot send message.")
            return False
        
        phone_number = message_data.get('phone_number')
        message_body = message_data.get('message_body')
        template_name = message_data.get('template_name')
        template_params = message_data.get('template_params', [])
        
        logger.info(f"Message Details:")
        logger.info(f"  To: {phone_number}")
        logger.info(f"  Type: {'Template' if template_name else 'Text'}")
        logger.info(f"  Template: {template_name}")
        logger.info(f"  Message Length: {len(message_body) if message_body else 0}")
        
        if not phone_number:
            logger.error("No phone number provided - CANNOT SEND")
            return False
        
        logger.info(f"API Configuration:")
        logger.info(f"  API URL: {WHATSAPP_API_URL}")
        logger.info(f"  Phone ID: {WHATSAPP_PHONE_NUMBER_ID}")
        logger.info(f"  Token Length: {len(WHATSAPP_ACCESS_TOKEN)}")
        
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        logger.info(f"  Full URL: {url}")
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Use template-based messaging (recommended for production)
        if template_name:
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_number,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": "en_US"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [{"type": "text", "text": str(param)} for param in template_params]
                        }
                    ]
                }
            }
        else:
            # Use text message (for development/testing)
            payload = {
                "messaging_product": "whatsapp",
                "to": phone_number,
                "type": "text",
                "text": {
                    "body": message_body
                }
            }
        
        logger.info(f"Sending request to WhatsApp API...")
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        logger.info(f"Response Status: {response.status_code}")
        logger.info(f"Response Text: {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info(f"✓ WhatsApp message sent successfully to {phone_number}")
            logger.info(f"===== WHATSAPP MESSAGE SEND END (SUCCESS) =====")
            return True
        else:
            logger.error(f"✗ Failed to send WhatsApp message: {response.status_code} - {response.text}")
            logger.info(f"===== WHATSAPP MESSAGE SEND END (FAILED) =====")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"WhatsApp API request error: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending WhatsApp message: {e}", exc_info=True)
        return False

def send_registration_confirmation(patient_data: Dict[str, Any]) -> bool:
    """
    Send registration confirmation message to patient using template
    
    Args:
        patient_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_id: Generated patient ID
            - first_name: Patient's first name
            - last_name: Patient's last name
            - blood_group: Blood group
            - registration_fee: Registration fee paid
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping registration message")
            return True  # Return True so registration continues
        
        phone_number = validate_phone_number(patient_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for registration confirmation")
            return False
        
        # Use template if available, otherwise fallback
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_REGISTRATION.format(
                    patient_id=patient_data.get('patient_id', 'N/A'),
                    patient_name=f"{patient_data.get('first_name', '')} {patient_data.get('last_name', '')}",
                    phone_number=patient_data.get('phone_number', 'N/A'),
                    blood_group=patient_data.get('blood_group', 'N/A'),
                    registration_fee=patient_data.get('registration_fee', 0)
                )
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""Welcome to CityCare Hospital! 🏥

Your registration has been completed successfully.

📋 Your Patient ID: {patient_data.get('patient_id', 'N/A')}
👤 Name: {patient_data.get('first_name', '')} {patient_data.get('last_name', '')}
💰 Registration Fee: ₹{patient_data.get('registration_fee', '0')}

You can now book appointments and access your medical records. Log in with your credentials to get started.

For assistance: +91-XXXXX-XXXXX
🔐 Keep your Patient ID safe for future reference."""
        else:
            message_body = f"""Welcome to CityCare Hospital! 🏥

Your registration has been completed successfully.

📋 Your Patient ID: {patient_data.get('patient_id', 'N/A')}
👤 Name: {patient_data.get('first_name', '')} {patient_data.get('last_name', '')}
💰 Registration Fee: ₹{patient_data.get('registration_fee', '0')}

You can now book appointments and access your medical records. Log in with your credentials to get started.

For assistance: +91-XXXXX-XXXXX
🔐 Keep your Patient ID safe for future reference."""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,  # Using text message for flexibility
            'message_type': MessageType.REGISTRATION.value,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add to queue for asynchronous processing
        message_queue.put(message_data)
        logger.info(f"Registration confirmation queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing registration confirmation: {e}")
        return True  # Return True so registration continues even if WhatsApp fails

def send_appointment_booking_notification(appointment_data: Dict[str, Any]) -> bool:
    """
    Send appointment booking notification to patient using template
    
    Args:
        appointment_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - appointment_id: Appointment ID
            - doctor_name: Doctor's name
            - specialty: Doctor's specialty
            - department: Department name
            - appointment_date: Date of appointment
            - appointment_time: Time of appointment
            - appointment_type: Type of appointment
            - consultation_mode: Mode (In-person/Online)
            - token_number: Token number
            - status: Current status (Pending_Approval/Confirmed)
    """
    try:
        logger.info(f"===== APPOINTMENT BOOKING NOTIFICATION START =====")
        logger.info(f"Appointment data received: {appointment_data}")
        
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.warning("WhatsApp credentials not configured - skipping appointment booking message")
            return True
        
        logger.info(f"WhatsApp credentials found. Access Token present: {bool(WHATSAPP_ACCESS_TOKEN)}, Phone ID present: {bool(WHATSAPP_PHONE_NUMBER_ID)}")
        
        phone_number = validate_phone_number(appointment_data.get('phone_number', ''))
        logger.info(f"Validated phone number: {phone_number}")
        
        if not phone_number:
            logger.error("Invalid/Empty phone number after validation - CANNOT SEND MESSAGE")
            return False
        
        # Choose template based on status
        status = appointment_data.get('status', 'Pending_Approval')
        if status == 'Confirmed':
            template = TEMPLATE_APPOINTMENT_BOOKING_CONFIRMED if TEMPLATES_AVAILABLE else None
        else:
            template = TEMPLATE_APPOINTMENT_BOOKING_PENDING if TEMPLATES_AVAILABLE else None
        
        # Use template if available
        if TEMPLATES_AVAILABLE and template:
            try:
                message_body = template.format(
                    patient_name=appointment_data.get('patient_name', 'Patient'),
                    appointment_id=appointment_data.get('appointment_id', 'N/A'),
                    doctor_name=appointment_data.get('doctor_name', 'N/A'),
                    specialty=appointment_data.get('specialty', 'General'),
                    department=appointment_data.get('department', 'General'),
                    appointment_date=appointment_data.get('appointment_date', 'N/A'),
                    appointment_time=appointment_data.get('appointment_time', 'N/A'),
                    appointment_type=appointment_data.get('appointment_type', 'General Checkup'),
                    consultation_mode=appointment_data.get('consultation_mode', 'In-person'),
                    token_number=appointment_data.get('token_number', 'N/A')
                )
                logger.info("✓ Template used for appointment booking")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"Appointment booked with Dr. {appointment_data.get('doctor_name')} on {appointment_data.get('appointment_date')}"
        else:
            message_body = f"Appointment booked with Dr. {appointment_data.get('doctor_name')} on {appointment_data.get('appointment_date')}"
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.APPOINTMENT_BOOKED.value,
            'appointment_id': appointment_data.get('appointment_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Adding template message to queue for {phone_number}")
        message_queue.put(message_data)
        logger.info(f"✓ Appointment booking notification queued for {phone_number}")
        logger.info(f"===== APPOINTMENT BOOKING NOTIFICATION END =====")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing appointment booking notification: {e}", exc_info=True)
        return True  # Return True so appointment continues

def send_appointment_approval_notification(appointment_data: Dict[str, Any]) -> bool:
    """
    Send appointment approval confirmation message to patient using template
    
    Args:
        appointment_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - appointment_id: Appointment ID
            - doctor_name: Doctor's name
            - department: Department name
            - appointment_date: Date of appointment
            - appointment_time: Time of appointment
            - token_number: Token number in queue
            - floor: Floor number
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping appointment approval message")
            return True
        
        phone_number = validate_phone_number(appointment_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for appointment approval")
            return False
        
        appointment_date = appointment_data.get('appointment_date', '')
        appointment_time = appointment_data.get('appointment_time', '')
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_APPOINTMENT_APPROVED.format(
                    patient_name=appointment_data.get('patient_name', 'Patient'),
                    appointment_id=appointment_data.get('appointment_id', 'N/A'),
                    doctor_name=appointment_data.get('doctor_name', 'N/A'),
                    department=appointment_data.get('department', 'General'),
                    appointment_date=appointment_date,
                    appointment_time=appointment_time,
                    token_number=appointment_data.get('token_number', 'N/A'),
                    floor=appointment_data.get('floor', 'Ground Floor')
                )
                logger.info("✓ Template used for appointment approval")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""✅ Appointment Confirmed!

Dear {appointment_data.get('patient_name', 'Patient')},

Your appointment has been confirmed by our reception team.

🎫 Confirmation ID: {appointment_data.get('appointment_id', 'N/A')}
🔢 Token Number: {appointment_data.get('token_number', 'N/A')}
👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_date}
⏰ Time: {appointment_time}

📝 IMPORTANT INSTRUCTIONS:
• Please arrive 15 minutes before your appointment time
• Bring your Patient ID and valid ID proof
• Carry all relevant medical documents

See you soon! 👋"""
        else:
            message_body = f"""✅ Appointment Confirmed!

Dear {appointment_data.get('patient_name', 'Patient')},

Your appointment has been confirmed by our reception team.

🎫 Confirmation ID: {appointment_data.get('appointment_id', 'N/A')}
🔢 Token Number: {appointment_data.get('token_number', 'N/A')}
👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_date}
⏰ Time: {appointment_time}

📝 IMPORTANT INSTRUCTIONS:
• Please arrive 15 minutes before your appointment time
• Bring your Patient ID and valid ID proof
• Carry all relevant medical documents

See you soon! 👋"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.APPOINTMENT_APPROVED.value,
            'appointment_id': appointment_data.get('appointment_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Appointment approval notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing appointment approval notification: {e}")
        return True  # Return True so approval continues

def send_lab_results_notification(lab_data: Dict[str, Any]) -> bool:
    """
    Send lab results notification to patient using template
    
    Args:
        lab_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - patient_id: Patient ID
            - lab_order_id: Lab order ID
            - lab_report_id: Lab report ID
            - test_type: Type of test
            - sample_date: Date sample was taken
            - test_names: List of test names performed
            - upload_date: Date when results were uploaded
            - results_status: Status (Normal/Abnormal)
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping lab results message")
            return True
        
        phone_number = validate_phone_number(lab_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for lab results notification")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_LAB_RESULTS_READY.format(
                    patient_name=lab_data.get('patient_name', 'Patient'),
                    patient_id=lab_data.get('patient_id', 'N/A'),
                    lab_date=lab_data.get('upload_date', 'Today'),
                    lab_report_id=lab_data.get('lab_report_id', lab_data.get('lab_order_id', 'N/A')),
                    test_type=lab_data.get('test_type', 'Lab Tests'),
                    sample_date=lab_data.get('sample_date', 'N/A'),
                    results_status=lab_data.get('results_status', 'Available')
                )
                logger.info("✓ Template used for lab results")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                test_names = lab_data.get('test_names', [])
                tests_str = '\n'.join([f"• {test}" for test in test_names]) if test_names else "• Tests performed"
                message_body = f"""🧪 Your Lab Results Are Ready!

Dear {lab_data.get('patient_name', 'Patient')},

Your lab test results have been uploaded to your medical records.

📋 Lab Order ID: {lab_data.get('lab_order_id', 'N/A')}
📅 Results Date: {lab_data.get('upload_date', 'Today')}

Tests Performed:
{tests_str}

View your complete results in the "Medical Records" section of your patient portal.

For urgent concerns: +91-XXXXX-XXXXX

Stay healthy! 💪"""
        else:
            test_names = lab_data.get('test_names', [])
            tests_str = '\n'.join([f"• {test}" for test in test_names]) if test_names else "• Tests performed"
            message_body = f"""🧪 Your Lab Results Are Ready!

Dear {lab_data.get('patient_name', 'Patient')},

Your lab test results have been uploaded to your medical records.

📋 Lab Order ID: {lab_data.get('lab_order_id', 'N/A')}
📅 Results Date: {lab_data.get('upload_date', 'Today')}

Tests Performed:
{tests_str}

View your complete results in the "Medical Records" section of your patient portal.

For urgent concerns: +91-XXXXX-XXXXX

Stay healthy! 💪"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.LAB_RESULTS.value,
            'lab_order_id': lab_data.get('lab_order_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Lab results notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing lab results notification: {e}")
        return True  # Return True so lab results continue

def send_appointment_reminder(appointment_data: Dict[str, Any]) -> bool:
    """
    Send appointment reminder to patient (24 hours before) using template
    
    Args:
        appointment_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - appointment_id: Appointment ID
            - doctor_name: Doctor's name
            - department: Department name
            - appointment_date: Date of appointment
            - appointment_time: Time of appointment
            - token_number: Token number in queue
            - floor: Floor number
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping appointment reminder message")
            return True
        
        phone_number = validate_phone_number(appointment_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for appointment reminder")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_APPOINTMENT_REMINDER.format(
                    patient_name=appointment_data.get('patient_name', 'Patient'),
                    doctor_name=appointment_data.get('doctor_name', 'N/A'),
                    appointment_id=appointment_data.get('appointment_id', 'N/A'),
                    department=appointment_data.get('department', 'N/A'),
                    appointment_date=appointment_data.get('appointment_date', 'N/A'),
                    appointment_time=appointment_data.get('appointment_time', 'N/A'),
                    token_number=appointment_data.get('token_number', 'N/A'),
                    floor=appointment_data.get('floor', 'Ground Floor')
                )
                logger.info("✓ Template used for appointment reminder")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""⏰ Appointment Reminder

Dear {appointment_data.get('patient_name', 'Patient')},

This is a reminder about your upcoming appointment.

👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_data.get('appointment_date', 'N/A')}
⏰ Time: {appointment_data.get('appointment_time', 'N/A')}
🔢 Token: {appointment_data.get('token_number', 'N/A')}

📝 Remember:
• Arrive 15 minutes early
• Bring your Patient ID
• Keep your mobile charged

See you soon! 👋"""
        else:
            message_body = f"""⏰ Appointment Reminder

Dear {appointment_data.get('patient_name', 'Patient')},

This is a reminder about your upcoming appointment.

👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_data.get('appointment_date', 'N/A')}
⏰ Time: {appointment_data.get('appointment_time', 'N/A')}
🔢 Token: {appointment_data.get('token_number', 'N/A')}

📝 Remember:
• Arrive 15 minutes early
• Bring your Patient ID
• Keep your mobile charged

See you soon! 👋"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.APPOINTMENT_REMINDER.value,
            'appointment_id': appointment_data.get('appointment_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Appointment reminder queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing appointment reminder: {e}")
        return True  # Return True so reminder continues

def send_appointment_cancellation_notification(appointment_data: Dict[str, Any]) -> bool:
    """
    Send appointment cancellation notification using template
    
    Args:
        appointment_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - appointment_id: Appointment ID
            - doctor_name: Doctor's name
            - appointment_date: Date of appointment
            - appointment_time: Time of appointment
            - cancellation_reason: Reason for cancellation
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping cancellation message")
            return True
        
        phone_number = validate_phone_number(appointment_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for cancellation notification")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_APPOINTMENT_CANCELLED.format(
                    patient_name=appointment_data.get('patient_name', 'Patient'),
                    appointment_id=appointment_data.get('appointment_id', 'N/A'),
                    doctor_name=appointment_data.get('doctor_name', 'N/A'),
                    appointment_date=appointment_data.get('appointment_date', 'N/A'),
                    appointment_time=appointment_data.get('appointment_time', 'N/A'),
                    cancellation_reason=appointment_data.get('cancellation_reason', 'As per request')
                )
                logger.info("✓ Template used for appointment cancellation")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""❌ Appointment Cancelled

Dear {appointment_data.get('patient_name', 'Patient')},

Your appointment has been cancelled.

🎫 Appointment ID: {appointment_data.get('appointment_id', 'N/A')}
👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_data.get('appointment_date', 'N/A')}
⏰ Time: {appointment_data.get('appointment_time', 'N/A')}

To book a new appointment, visit: www.citycareportal.com
Or call us at: +91-XXXXX-XXXXX

We look forward to serving you! 🙏"""
        else:
            message_body = f"""❌ Appointment Cancelled

Dear {appointment_data.get('patient_name', 'Patient')},

Your appointment has been cancelled.

🎫 Appointment ID: {appointment_data.get('appointment_id', 'N/A')}
👨‍⚕️ Doctor: Dr. {appointment_data.get('doctor_name', 'N/A')}
📅 Date: {appointment_data.get('appointment_date', 'N/A')}
⏰ Time: {appointment_data.get('appointment_time', 'N/A')}

To book a new appointment, visit: www.citycareportal.com
Or call us at: +91-XXXXX-XXXXX

We look forward to serving you! 🙏"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.APPOINTMENT_CANCELLED.value,
            'appointment_id': appointment_data.get('appointment_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Cancellation notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing cancellation notification: {e}")
        return True  # Return True so cancellation continues

def send_consultation_completion_notification(consultation_data: Dict[str, Any]) -> bool:
    """
    Send notification when consultation is completed using template
    
    Args:
        consultation_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - appointment_id: Appointment ID
            - doctor_name: Doctor's name
            - appointment_date: Date of consultation
            - appointment_time: Time of consultation
            - diagnosis: Diagnosis/findings
            - recommendations: Doctor's recommendations
            - follow_up_date: Follow-up date (if any)
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping consultation completion message")
            return True
        
        phone_number = validate_phone_number(consultation_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for consultation completion")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_CONSULTATION_COMPLETE.format(
                    patient_name=consultation_data.get('patient_name', 'Patient'),
                    appointment_id=consultation_data.get('appointment_id', 'N/A'),
                    doctor_name=consultation_data.get('doctor_name', 'N/A'),
                    appointment_date=consultation_data.get('appointment_date', 'Today'),
                    appointment_time=consultation_data.get('appointment_time', 'N/A'),
                    diagnosis=consultation_data.get('diagnosis', 'See doctor notes'),
                    recommendations=consultation_data.get('recommendations', 'Follow doctor advice'),
                    follow_up_date=consultation_data.get('follow_up_date', 'As recommended')
                )
                logger.info("✓ Template used for consultation completion")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""✅ Your Consultation is Complete

Dear {consultation_data.get('patient_name', 'Patient')},

Your consultation with Dr. {consultation_data.get('doctor_name', 'N/A')} has been completed.

🎫 Appointment ID: {consultation_data.get('appointment_id', 'N/A')}
📅 Date: {consultation_data.get('appointment_date', 'Today')}

📋 NEXT STEPS:
• Review your prescription in Medical Records
• Follow the doctor's recommendations
• Schedule any recommended tests or follow-ups
• View consultation notes in your patient portal

📱 Access your records: www.citycareportal.com

Thank you for choosing CityCare Hospital! 🏥"""
        else:
            message_body = f"""✅ Your Consultation is Complete

Dear {consultation_data.get('patient_name', 'Patient')},

Your consultation with Dr. {consultation_data.get('doctor_name', 'N/A')} has been completed.

🎫 Appointment ID: {consultation_data.get('appointment_id', 'N/A')}
📅 Date: {consultation_data.get('appointment_date', 'Today')}

📋 NEXT STEPS:
• Review your prescription in Medical Records
• Follow the doctor's recommendations
• Schedule any recommended tests or follow-ups
• View consultation notes in your patient portal

📱 Access your records: www.citycareportal.com

Thank you for choosing CityCare Hospital! 🏥"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.CONSULTATION_COMPLETE.value,
            'appointment_id': consultation_data.get('appointment_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Consultation completion notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing consultation completion notification: {e}")
        return True  # Return True so consultation completion continues

def send_prescription_ready_notification(prescription_data: Dict[str, Any]) -> bool:
    """
    Send notification when prescription is ready for pickup/delivery using template
    
    Args:
        prescription_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - doctor_name: Doctor's name
            - appointment_id: Appointment ID
            - prescription_id: Prescription ID
            - prescription_date: Date prescription was issued
            - medicines_list: List of medicines
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping prescription ready message")
            return True
        
        phone_number = validate_phone_number(prescription_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for prescription ready notification")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_PRESCRIPTION_READY.format(
                    patient_name=prescription_data.get('patient_name', 'Patient'),
                    doctor_name=prescription_data.get('doctor_name', 'N/A'),
                    appointment_id=prescription_data.get('appointment_id', 'N/A'),
                    prescription_id=prescription_data.get('prescription_id', 'N/A'),
                    prescription_date=prescription_data.get('prescription_date', 'Today'),
                    medicines_list=prescription_data.get('medicines_list', 'N/A')
                )
                logger.info("✓ Template used for prescription ready")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""💊 Your Prescription is Ready!

Dear {prescription_data.get('patient_name', 'Patient')},

Your prescription from Dr. {prescription_data.get('doctor_name', 'N/A')} is ready for pickup.

🔢 Prescription ID: {prescription_data.get('prescription_id', 'N/A')}
📅 Date: {prescription_data.get('ready_date', 'Today')}

OPTIONS:
1. Pickup at our pharmacy - Open 24 hours
2. Home delivery - Available within 2 hours
3. Send to your pharmacy - Ask our staff

Call us at +91-XXXXX-XXXXX for delivery.

Stay healthy! 🙏"""
        else:
            message_body = f"""💊 Your Prescription is Ready!

Dear {prescription_data.get('patient_name', 'Patient')},

Your prescription from Dr. {prescription_data.get('doctor_name', 'N/A')} is ready for pickup.

🔢 Prescription ID: {prescription_data.get('prescription_id', 'N/A')}
📅 Date: {prescription_data.get('ready_date', 'Today')}

OPTIONS:
1. Pickup at our pharmacy - Open 24 hours
2. Home delivery - Available within 2 hours
3. Send to your pharmacy - Ask our staff

Call us at +91-XXXXX-XXXXX for delivery.

Stay healthy! 🙏"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.PRESCRIPTION_READY.value,
            'prescription_id': prescription_data.get('prescription_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Prescription ready notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing prescription ready notification: {e}")
        return True  # Return True so prescription ready continues

def send_payment_reminder(payment_data: Dict[str, Any]) -> bool:
    """
    Send payment reminder to patient using template
    
    Args:
        payment_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - patient_id: Patient ID
            - amount_due: Amount to be paid
            - payment_reference: Reference ID (appointment/invoice)
            - due_date: Payment due date
            - payment_description: Description of charges
            - service_type: Type of service
            - service_date: Date of service
            - invoice_number: Invoice number
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping payment reminder message")
            return True
        
        phone_number = validate_phone_number(payment_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for payment reminder")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_PAYMENT_REMINDER.format(
                    patient_name=payment_data.get('patient_name', 'Patient'),
                    patient_id=payment_data.get('patient_id', 'N/A'),
                    amount_due=payment_data.get('amount_due', payment_data.get('amount', 0)),
                    payment_reference=payment_data.get('payment_reference', payment_data.get('invoice_id', 'N/A')),
                    due_date=payment_data.get('due_date', 'N/A'),
                    payment_description=payment_data.get('payment_description', 'Medical Services'),
                    service_type=payment_data.get('service_type', 'Service'),
                    service_date=payment_data.get('service_date', 'N/A'),
                    invoice_number=payment_data.get('invoice_number', payment_data.get('invoice_id', 'N/A'))
                )
                logger.info("✓ Template used for payment reminder")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""💰 Payment Reminder

Dear {payment_data.get('patient_name', 'Patient')},

This is a friendly reminder about your pending payment.

📋 Invoice ID: {payment_data.get('invoice_id', 'N/A')}
💵 Amount: ₹{payment_data.get('amount_due', payment_data.get('amount', 0))}
📅 Due Date: {payment_data.get('due_date', 'N/A')}

PAYMENT OPTIONS:
• Online: www.citycareportal.com
• Card/UPI: +91-XXXXX-XXXXX
• In-person: Billing Counter

Pay now to avoid service interruptions.

Thank you! 🙏"""
        else:
            message_body = f"""💰 Payment Reminder

Dear {payment_data.get('patient_name', 'Patient')},

This is a friendly reminder about your pending payment.

📋 Invoice ID: {payment_data.get('invoice_id', 'N/A')}
💵 Amount: ₹{payment_data.get('amount_due', payment_data.get('amount', 0))}
📅 Due Date: {payment_data.get('due_date', 'N/A')}

PAYMENT OPTIONS:
• Online: www.citycareportal.com
• Card/UPI: +91-XXXXX-XXXXX
• In-person: Billing Counter

Pay now to avoid service interruptions.

Thank you! 🙏"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': MessageType.PAYMENT_REMINDER.value,
            'invoice_id': payment_data.get('invoice_id'),
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Payment reminder queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing payment reminder: {e}")
        return True  # Return True so payment reminder continues

def send_medical_records_available_notification(records_data: Dict[str, Any]) -> bool:
    """
    Send notification when medical records are updated using template
    
    Args:
        records_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - patient_id: Patient ID
            - update_date: Date of update
    """
    try:
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping medical records message")
            return True
        
        phone_number = validate_phone_number(records_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for medical records notification")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_MEDICAL_RECORDS_AVAILABLE.format(
                    patient_name=records_data.get('patient_name', 'Patient'),
                    patient_id=records_data.get('patient_id', 'N/A'),
                    update_date=records_data.get('update_date', 'Today')
                )
                logger.info("✓ Template used for medical records available")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""📋 Your Medical Records Have Been Updated!

Dear {records_data.get('patient_name', 'Patient')},

New updates have been added to your medical records.

Patient ID: {records_data.get('patient_id', 'N/A')}
📅 Update Date: {records_data.get('update_date', 'Today')}

📱 Access your records: www.citycareportal.com

Keep your records updated for better healthcare management.

Thank you for choosing CityCare Hospital! 🏥"""
        else:
            message_body = f"""📋 Your Medical Records Have Been Updated!

Dear {records_data.get('patient_name', 'Patient')},

New updates have been added to your medical records.

Patient ID: {records_data.get('patient_id', 'N/A')}
📅 Update Date: {records_data.get('update_date', 'Today')}

📱 Access your records: www.citycareportal.com

Keep your records updated for better healthcare management.

Thank you for choosing CityCare Hospital! 🏥"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': 'medical_records_available',
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Medical records available notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing medical records notification: {e}")
        return True

def send_discharge_summary_notification(discharge_data: Dict[str, Any]) -> bool:
    """
    Send discharge summary notification using template
    
    Args:
        discharge_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - admission_date: Date of admission
            - discharge_date: Date of discharge
            - diagnosis: Final diagnosis
            - discharge_instructions: Instructions for post-discharge care
    """
    try:
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping discharge summary")
            return True
        
        phone_number = validate_phone_number(discharge_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for discharge summary")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_DISCHARGE_SUMMARY.format(
                    patient_name=discharge_data.get('patient_name', 'Patient'),
                    admission_date=discharge_data.get('admission_date', 'N/A'),
                    discharge_date=discharge_data.get('discharge_date', 'Today'),
                    diagnosis=discharge_data.get('diagnosis', 'See discharge papers'),
                    discharge_instructions=discharge_data.get('discharge_instructions', 'Follow doctor advice')
                )
                logger.info("✓ Template used for discharge summary")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""✅ You Have Been Discharged

Dear {discharge_data.get('patient_name', 'Patient')},

We are glad to inform you that you have been discharged.

📅 Admission Date: {discharge_data.get('admission_date', 'N/A')}
📅 Discharge Date: {discharge_data.get('discharge_date', 'Today')}

📋 Diagnosis: {discharge_data.get('diagnosis', 'See discharge papers')}

Follow-up Care:
{discharge_data.get('discharge_instructions', 'Follow doctor advice')}

Thank you for trusting CityCare Hospital. Wishing you a speedy recovery! 🙏"""
        else:
            message_body = f"""✅ You Have Been Discharged

Dear {discharge_data.get('patient_name', 'Patient')},

We are glad to inform you that you have been discharged.

📅 Admission Date: {discharge_data.get('admission_date', 'N/A')}
📅 Discharge Date: {discharge_data.get('discharge_date', 'Today')}

📋 Diagnosis: {discharge_data.get('diagnosis', 'See discharge papers')}

Follow-up Care:
{discharge_data.get('discharge_instructions', 'Follow doctor advice')}

Thank you for trusting CityCare Hospital. Wishing you a speedy recovery! 🙏"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': 'discharge_summary',
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Discharge summary notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing discharge summary: {e}")
        return True

def send_vaccination_record_notification(vaccination_data: Dict[str, Any]) -> bool:
    """
    Send vaccination record notification using template
    
    Args:
        vaccination_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - vaccine_name: Name of vaccine
            - vaccination_date: Date of vaccination
            - batch_number: Batch number
            - next_dose_date: Date for next dose (if applicable)
    """
    try:
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping vaccination record")
            return True
        
        phone_number = validate_phone_number(vaccination_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for vaccination record")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_VACCINATION_RECORD.format(
                    patient_name=vaccination_data.get('patient_name', 'Patient'),
                    vaccine_name=vaccination_data.get('vaccine_name', 'Vaccine'),
                    vaccination_date=vaccination_data.get('vaccination_date', 'Today'),
                    batch_number=vaccination_data.get('batch_number', 'N/A'),
                    next_dose_date=vaccination_data.get('next_dose_date', 'As per schedule')
                )
                logger.info("✓ Template used for vaccination record")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""💉 Vaccination Record Updated

Dear {vaccination_data.get('patient_name', 'Patient')},

Your vaccination has been recorded successfully.

💊 Vaccine: {vaccination_data.get('vaccine_name', 'N/A')}
📅 Vaccination Date: {vaccination_data.get('vaccination_date', 'Today')}
🔢 Batch Number: {vaccination_data.get('batch_number', 'N/A')}

Next Dose (if applicable): {vaccination_data.get('next_dose_date', 'As per schedule')}

Your vaccination record is available in your medical records.

Stay safe and healthy! 💪"""
        else:
            message_body = f"""💉 Vaccination Record Updated

Dear {vaccination_data.get('patient_name', 'Patient')},

Your vaccination has been recorded successfully.

💊 Vaccine: {vaccination_data.get('vaccine_name', 'N/A')}
📅 Vaccination Date: {vaccination_data.get('vaccination_date', 'Today')}
🔢 Batch Number: {vaccination_data.get('batch_number', 'N/A')}

Next Dose (if applicable): {vaccination_data.get('next_dose_date', 'As per schedule')}

Your vaccination record is available in your medical records.

Stay safe and healthy! 💪"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': 'vaccination_record',
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Vaccination record notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing vaccination record: {e}")
        return True

def send_health_checkup_summary_notification(checkup_data: Dict[str, Any]) -> bool:
    """
    Send health checkup summary notification using template
    
    Args:
        checkup_data: Dictionary containing:
            - phone_number: Patient's phone number
            - patient_name: Full name of patient
            - checkup_date: Date of checkup
            - checkup_type: Type of checkup
            - findings: Key findings from checkup
            - recommendations: Doctor's recommendations
    """
    try:
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping health checkup summary")
            return True
        
        phone_number = validate_phone_number(checkup_data.get('phone_number', ''))
        
        if not phone_number:
            logger.warning("Invalid phone number for health checkup summary")
            return False
        
        # Use template if available
        if TEMPLATES_AVAILABLE:
            try:
                message_body = TEMPLATE_HEALTH_CHECKUP.format(
                    patient_name=checkup_data.get('patient_name', 'Patient'),
                    checkup_date=checkup_data.get('checkup_date', 'Today'),
                    checkup_type=checkup_data.get('checkup_type', 'General Checkup'),
                    findings=checkup_data.get('findings', 'See detailed report'),
                    recommendations=checkup_data.get('recommendations', 'Follow doctor advice')
                )
                logger.info("✓ Template used for health checkup summary")
            except KeyError as e:
                logger.warning(f"Template variable missing: {e}, using fallback")
                message_body = f"""💚 Your Health Checkup is Complete

Dear {checkup_data.get('patient_name', 'Patient')},

Your {checkup_data.get('checkup_type', 'health checkup')} has been completed successfully.

📅 Checkup Date: {checkup_data.get('checkup_date', 'Today')}

📋 Key Findings:
{checkup_data.get('findings', 'See detailed report')}

💊 Recommendations:
{checkup_data.get('recommendations', 'Follow doctor advice')}

Detailed report is available in your medical records.

Take care of your health! 🏥"""
        else:
            message_body = f"""💚 Your Health Checkup is Complete

Dear {checkup_data.get('patient_name', 'Patient')},

Your {checkup_data.get('checkup_type', 'health checkup')} has been completed successfully.

📅 Checkup Date: {checkup_data.get('checkup_date', 'Today')}

📋 Key Findings:
{checkup_data.get('findings', 'See detailed report')}

💊 Recommendations:
{checkup_data.get('recommendations', 'Follow doctor advice')}

Detailed report is available in your medical records.

Take care of your health! 🏥"""
        
        message_data = {
            'phone_number': phone_number,
            'message_body': message_body,
            'template_name': None,
            'message_type': 'health_checkup',
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"Health checkup summary notification queued for {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing health checkup summary: {e}")
        return True

# Initialize the message queue worker when module is imported
try:
    start_message_queue_worker()
except Exception as e:
    logger.error(f"Error starting message queue worker: {e}")

def send_otp_message(phone_number: str, otp: str, first_name: str) -> bool:
    """
    Send OTP verification message
    """
    try:
        # Skip if credentials not configured
        if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
            logger.debug("WhatsApp not configured - skipping OTP message")
            return True
            
        valid_phone = validate_phone_number(phone_number)
        
        if not valid_phone:
            logger.warning("Invalid phone number for OTP")
            return False
            
        message_body = f"""🔐 CityCare Hospital Verification
        
Dear {first_name},

Your verification OTP is: *{otp}*

Please use this code to complete your registration. This code will expire in 5 minutes.

Do not share this code with anyone."""
        
        message_data = {
            'phone_number': valid_phone,
            'message_body': message_body,
            'template_name': None,
            'message_type': 'otp_verification',
            'timestamp': datetime.now().isoformat()
        }
        
        message_queue.put(message_data)
        logger.info(f"OTP message queued for {valid_phone}")
        return True
        
    except Exception as e:
        logger.error(f"Error preparing OTP message: {e}")
        return True
