from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.models import User
from django.conf import settings
import json

@method_decorator(csrf_exempt, name='dispatch')
class APIPasswordResetView(View):
    """
    Custom password reset view for API usage (no CSRF required)
    """
    
    def post(self, request):
        try:
            # Parse JSON data
            data = json.loads(request.body)
            email = data.get('email', '')
            
            if not email:
                return JsonResponse({
                    'error': 'Email is required'
                }, status=400)
            
            # Check if user exists with this email
            users = User.objects.filter(email__iexact=email)
            
            if not users.exists():
                # For security, don't reveal if user exists or not
                return JsonResponse({
                    'message': 'If an account exists with this email, you will receive a password reset link shortly.'
                }, status=200)
            
            # Generate password reset token for each user
            for user in users:
                # Generate token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Build reset URL
                reset_url = f"{request.scheme}://{request.get_host()}/api/reset/{uid}/{token}/"
                
                # Simple email content (no templates)
                subject = "Password Reset Request - DOC Media"
                message = f"""Hello,

You're receiving this email because you requested a password reset for your DOC Media account.

Please go to the following page and choose a new password:
{reset_url}

Your username, in case you've forgotten: {user.username}

Thanks for using our site!

The DOC Media Team
"""
                
                html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 30px; background-color: #f9f9f9; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DOC Media</h1>
            <h2>Password Reset Request</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You're receiving this email because you requested a password reset for your DOC Media account.</p>
            <p>Please click the button below to choose a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
                {reset_url}
            </p>
            <p>Your username: <strong>{user.username}</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Thanks for using DOC Media!</p>
            <p>The DOC Media Team</p>
        </div>
    </div>
</body>
</html>
"""
                
                # Send email
                try:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                except Exception as e:
                    print(f"Error sending password reset email to {user.email}: {e}")
                    # Continue with other users
            
            return JsonResponse({
                'message': 'If an account exists with this email, you will receive a password reset link shortly.'
            }, status=200)
            
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            print(f"Password reset error: {e}")
            return JsonResponse({
                'error': 'An error occurred while processing your request'
            }, status=500)