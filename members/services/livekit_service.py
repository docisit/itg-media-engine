import aiohttp
import asyncio
import jwt
import time
import logging
import sys

# Setup logging to see output
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger(__name__)

class LiveKitEgressService:
    def __init__(self):
        self.host = 'http://localhost:7880'
        self.api_key = 'your-livekit-api-key'
        self.api_secret = 'your-livekit-api-secret'
        self.room_name = 'Broadcast_Studio_A1'
        logger.info(f"LiveKitEgressService initialized with host: {self.host}")
        
    def _get_token(self):
        token = jwt.encode(
            {
                'iss': self.api_key,
                'exp': int(time.time()) + 60,
                'nbf': int(time.time()) - 5,
                'sub': 'django_backend',
                'video': {
                    'roomCreate': True,
                    'roomJoin': True,
                    'roomRecord': True,
                    'roomAdmin': True
                }
            },
            self.api_secret,
            algorithm='HS256'
        )
        logger.info("Token generated for LiveKit API")
        return token
    
    async def start_egress(self, rtmp_url, stream_key):
        logger.info(f"Starting egress to {rtmp_url}")
        
        if not rtmp_url.endswith('/'):
            rtmp_url = rtmp_url + '/'
        full_url = rtmp_url + stream_key
        logger.info(f"Full RTMP URL: {full_url}")
        
        token = self._get_token()
        
        # Try different endpoint patterns
        endpoints = [
            ("/twirp/livekit.Egress/StartRoomCompositeEgress", {
                'room_name': self.room_name,
                'rtmp': {'url': full_url}
            }),
            ("/twirp/livekit.Egress/StartEgress", {
                'room_name': self.room_name,
                'rtmp_url': full_url
            }),
        ]
        
        for endpoint, payload in endpoints:
            url = f"{self.host}{endpoint}"
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            logger.info(f"Trying endpoint: {endpoint}")
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload) as resp:
                        response_text = await resp.text()
                        logger.info(f"Response status: {resp.status}")
                        logger.info(f"Response body: {response_text[:200]}")
                        
                        if resp.status == 200:
                            logger.info(f"✅ Success with endpoint {endpoint}")
                            return await resp.json()
                        elif resp.status == 404:
                            logger.warning(f"Endpoint not found: {endpoint}")
                            continue
                        else:
                            logger.error(f"Failed with status {resp.status}: {response_text}")
            except Exception as e:
                logger.error(f"Exception for endpoint {endpoint}: {e}")
        
        raise Exception("No working endpoint found")

    async def stop_egress(self, egress_id):
        logger.info(f"Stopping egress: {egress_id}")
        token = self._get_token()
        url = f"{self.host}/twirp/livekit.Egress/StopEgress"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        payload = {'egress_id': egress_id}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    logger.info(f"✅ Stopped egress {egress_id}")
                    return result
                else:
                    text = await resp.text()
                    logger.error(f"Failed to stop egress: {text}")
                    raise Exception(f"Failed to stop egress: {text}")

livekit_service = LiveKitEgressService()
