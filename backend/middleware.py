# backend/middleware.py
from django.core.exceptions import PermissionDenied
from django.conf import settings
import os

class AdminIPWhitelistMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if the request is for admin URLs
        admin_path = f'/{settings.ADMIN_URL}' if settings.ADMIN_URL else '/admin/'
        if request.path.startswith(admin_path):
            # 1. Get the real IP (handles proxies like Nginx/Cloudflare)
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            
            # 2. Get allowed IPs from settings (loaded from .env)
            allowed_ips = getattr(settings, 'ADMIN_IP_WHITELIST', ['127.0.0.1'])
            
            # 3. If DEBUG is True, allow all IPs for easier development
            if not settings.DEBUG:
                ip_allowed = False
                
                # Check X-Forwarded-For header (contains chain of proxies)
                if x_forwarded_for:
                    # Split by comma and check ALL IPs in the chain
                    ips = [ip.strip() for ip in x_forwarded_for.split(',')]
                    for ip in ips:
                        if ip in allowed_ips:
                            ip_allowed = True
                            break
                
                # If not found in X-Forwarded-For, check REMOTE_ADDR
                if not ip_allowed:
                    remote_addr = request.META.get('REMOTE_ADDR')
                    if remote_addr and remote_addr in allowed_ips:
                        ip_allowed = True
                
                # If still not allowed, block access
                if not ip_allowed:
                    raise PermissionDenied
        
        return self.get_response(request)
