"""
Email service for sending verification and notification emails
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import GuestRequest
import logging

logger = logging.getLogger(__name__)

def send_verification_email(guest_request: GuestRequest):
    """
    Send verification email to guest request applicant
    """
    try:
        # Generate verification token if not already generated
        if not guest_request.verification_token:
            guest_request.generate_verification_token()
        
        # Build verification URL - use FRONTEND_URL from settings, fallback to site domain
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://yourdomain.com')
        verification_url = f"{frontend_url}/verify-email?token={guest_request.verification_token}&email={guest_request.email}"
        
        # Email content
        subject = "Verify Your Email - DOC Show Guest Application"
        
        # HTML email template
        html_message = render_to_string('emails/verification_email.html', {
            'guest_name': guest_request.name,
            'verification_url': verification_url,
            'site_name': 'DOC Show',
        })
        
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[guest_request.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Verification email sent to {guest_request.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {guest_request.email}: {str(e)}")
        return False

def send_approval_email(guest_request: GuestRequest):
    """
    Send approval email to guest request applicant
    """
    try:
        subject = "Congratulations! Your Guest Application Has Been Approved"
        
        # HTML email template
        html_message = render_to_string('emails/approval_email.html', {
            'guest_name': guest_request.name,
            'site_name': 'DOC Show',
            'admin_contact': 'doc@yourdomain.com',
        })
        
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[guest_request.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Approval email sent to {guest_request.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send approval email to {guest_request.email}: {str(e)}")
        return False

def send_rejection_email(guest_request: GuestRequest, reason: str = ""):
    """
    Send rejection email to guest request applicant
    """
    try:
        subject = "Update on Your Guest Application"
        
        # HTML email template
        html_message = render_to_string('emails/rejection_email.html', {
            'guest_name': guest_request.name,
            'reason': reason or "We're currently not accepting new guests in your category.",
            'site_name': 'DOC Show',
            'admin_contact': 'doc@yourdomain.com',
        })
        
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[guest_request.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Rejection email sent to {guest_request.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send rejection email to {guest_request.email}: {str(e)}")
        return False