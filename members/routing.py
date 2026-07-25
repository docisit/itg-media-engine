from django.urls import re_path
from . import consumers
from . import ai_consumer

websocket_urlpatterns = [
    # WebRTC signaling
    re_path(r'ws/webrtc/(?P<room_id>[^/]+)/$', consumers.WebRTCConsumer.as_asgi()),
    re_path(r'ws/webrtc/(?P<room_id>[^/]+)/(?P<participant_id>[^/]+)/$', consumers.WebRTCConsumer.as_asgi()),
    
    # AI Chat (Coach & Athlete Assistants)
    # Connect to: ws://domain/ws/ai/coach/ or ws://domain/ws/ai/athlete/
    # Optional query param: ?session_id=123
    re_path(r'ws/ai/(?P<role>coach|athlete)/$', ai_consumer.AIChatConsumer.as_asgi()),
]
