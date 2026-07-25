import asyncio
from livekit import api
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class LiveKitEgressService:
    def __init__(self):
        self.host = 'http://localhost:7880'
        # IMPORTANT: Update these from your livekit.yaml
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET
        self.room_name = 'Broadcast_Studio_A1'
        
    async def start_egress(self, rtmp_url, stream_key):
        """Start RTMP egress to a platform"""
        # Construct full RTMP URL
        if not rtmp_url.endswith('/'):
            rtmp_url = rtmp_url + '/'
        full_url = rtmp_url + stream_key
        
        try:
            lkapi = api.LiveKitAPI(
                url=self.host,
                api_key=self.api_key,
                api_secret=self.api_secret
            )
            
            response = await lkapi.egress.start_egress(
                api.StartEgressRequest(
                    room_name=self.room_name,
                    rtmp=api.RtmpOutput(url=full_url)
                )
            )
            
            logger.info(f"✅ Started egress to {full_url}")
            await lkapi.aclose()
            return response
            
        except Exception as e:
            logger.error(f"❌ Failed to start egress: {e}")
            raise
    
    async def stop_egress(self, egress_id):
        """Stop an egress stream"""
        try:
            lkapi = api.LiveKitAPI(
                url=self.host,
                api_key=self.api_key,
                api_secret=self.api_secret
            )
            
            response = await lkapi.egress.stop_egress(
                api.StopEgressRequest(egress_id=egress_id)
            )
            
            logger.info(f"✅ Stopped egress {egress_id}")
            await lkapi.aclose()
            return response
            
        except Exception as e:
            logger.error(f"❌ Failed to stop egress: {e}")
            raise

# Singleton instance
livekit_service = LiveKitEgressService()
