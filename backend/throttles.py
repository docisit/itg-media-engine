# throttles.py
from rest_framework.throttling import AnonRateThrottle

class ExemptLocalhostAnonThrottle(AnonRateThrottle):
    def allow_request(self, request, view):
        # Extract the incoming IP address
        remote_addr = request.META.get('REMOTE_ADDR')
        
        # If the request comes from localhost, let it pass through unconditionally
        if remote_addr in ('127.0.0.1'):
            return True
            
        # Otherwise, fall back to the standard global anonymous limits
        return super().allow_request(request, view)