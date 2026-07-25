/**
 * WebRTC OBS Ingest Script
 * This script is loaded by OBS browser source to connect to WebRTC room
 */

(function() {
    'use strict';
    
    // Configuration from page
    const config = window.config || {};
    
    // DOM elements
    const remoteVideo = document.getElementById('remoteVideo');
    const localVideo = document.getElementById('localVideo');
    
    // WebRTC variables
    let peerConnection = null;
    let webSocket = null;
    let localStream = null;
    let remoteStream = null;
    
    // ICE servers configuration
    const iceServers = config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];
    
    // Connection status
    let isConnected = false;
    let isConnecting = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    // Initialize WebRTC connection
    async function initialize() {
        console.log('Initializing WebRTC OBS ingest...');
        
        try {
            // Initialize WebSocket connection
            await initializeWebSocket();
            
            // Initialize PeerConnection
            initializePeerConnection();
            
            // For OBS, we don't need local media (we're receiving only)
            // But we can optionally get local media if needed for preview
            if (config.is_host) {
                await getLocalMedia();
            }
            
            console.log('WebRTC initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
            handleError('Initialization failed: ' + error.message);
        }
    }
    
    // Initialize WebSocket connection
    function initializeWebSocket() {
        return new Promise((resolve, reject) => {
            if (!config.wsUrl) {
                reject(new Error('WebSocket URL not configured'));
                return;
            }
            
            webSocket = new WebSocket(config.wsUrl);
            
            webSocket.onopen = () => {
                console.log('WebSocket connected to:', config.wsUrl);
                isConnecting = true;
                
                // Send join message
                sendWebSocketMessage({
                    type: 'join',
                    display_name: config.participantName || 'OBS_Ingest',
                    role: config.is_host ? 'host' : 'guest',
                    has_audio: true,
                    has_video: true
                });
                
                resolve();
            };
            
            webSocket.onmessage = handleWebSocketMessage;
            
            webSocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                handleError('WebSocket connection error');
                reject(error);
            };
            
            webSocket.onclose = () => {
                console.log('WebSocket disconnected');
                isConnected = false;
                isConnecting = false;
                
                // Attempt to reconnect
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    setTimeout(() => {
                        initializeWebSocket().catch(console.error);
                    }, 2000 * reconnectAttempts); // Exponential backoff
                }
            };
        });
    }
    
    // Initialize PeerConnection
    function initializePeerConnection() {
        console.log('Initializing PeerConnection with ICE servers:', iceServers);
        
        const configuration = {
            iceServers: iceServers,
            iceCandidatePoolSize: 10
        };
        
        peerConnection = new RTCPeerConnection(configuration);
        
        // Handle incoming tracks (remote stream)
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            
            if (event.streams && event.streams[0]) {
                remoteStream = event.streams[0];
                
                // Set remote video source
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                }
                
                // Log stream information
                console.log('Remote stream active:', remoteStream.active);
                console.log('Video tracks:', remoteStream.getVideoTracks().length);
                console.log('Audio tracks:', remoteStream.getAudioTracks().length);
                
                // Dispatch event for external monitoring
                window.dispatchEvent(new CustomEvent('webrtc:stream:received', {
                    detail: { stream: remoteStream }
                }));
            }
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                sendWebSocketMessage({
                    type: 'signal',
                    signal_type: 'candidate',
                    target: config.is_host ? 'guest' : 'host',
                    payload: event.candidate
                });
            }
        };
        
        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            console.log('PeerConnection state:', state);
            
            isConnected = state === 'connected';
            
            // Dispatch event for external monitoring
            window.dispatchEvent(new CustomEvent('webrtc:connection:statechange', {
                detail: { state: state }
            }));
            
            if (state === 'connected') {
                console.log('WebRTC connection established');
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                
                // Dispatch connected event
                window.dispatchEvent(new CustomEvent('webrtc:connected'));
                
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                console.log('WebRTC connection lost:', state);
                
                // Dispatch disconnected event
                window.dispatchEvent(new CustomEvent('webrtc:disconnected', {
                    detail: { reason: state }
                }));
            }
        };
        
        // Handle ICE connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
            
            window.dispatchEvent(new CustomEvent('webrtc:ice:statechange', {
                detail: { state: peerConnection.iceConnectionState }
            }));
        };
        
        // Handle ICE gathering state
        peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', peerConnection.iceGatheringState);
        };
        
        // Handle signaling state
        peerConnection.onsignalingstatechange = () => {
            console.log('Signaling state:', peerConnection.signalingState);
        };
        
        console.log('PeerConnection initialized');
    }
    
    // Get local media (optional, for host or preview)
    async function getLocalMedia() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Add tracks to PeerConnection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            // Set local video source for preview
            if (localVideo) {
                localVideo.srcObject = localStream;
                localVideo.style.display = 'block';
            }
            
            console.log('Local media acquired:', localStream.getTracks().length, 'tracks');
            
            return localStream;
            
        } catch (error) {
            console.error('Failed to get local media:', error);
            // Don't fail the whole connection if local media fails
            return null;
        }
    }
    
    // Handle WebSocket messages
    function handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('Received WebSocket message:', message.type || message.signal_type);
            
            switch (message.type) {
                case 'connection_established':
                    console.log('Connection established, participant ID:', message.participant_id);
                    isConnecting = false;
                    isConnected = true;
                    break;
                    
                case 'signal':
                    handleSignalMessage(message);
                    break;
                    
                case 'participant_joined':
                    console.log('Participant joined:', message.display_name);
                    break;
                    
                case 'participant_left':
                    console.log('Participant left:', message.participant_id);
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
            
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    // Handle signaling messages
    async function handleSignalMessage(message) {
        const { signal_type, sender, payload } = message;
        
        try {
            switch (signal_type) {
                case 'offer':
                    console.log('Received offer from:', sender);
                    await handleOffer(payload, sender);
                    break;
                    
                case 'answer':
                    console.log('Received answer from:', sender);
                    await handleAnswer(payload);
                    break;
                    
                case 'candidate':
                    console.log('Received ICE candidate from:', sender);
                    await handleCandidate(payload);
                    break;
                    
                default:
                    console.log('Unknown signal type:', signal_type);
            }
        } catch (error) {
            console.error('Error handling signal:', error);
            handleError('Signal handling error: ' + error.message);
        }
    }
    
    // Handle incoming offer
    async function handleOffer(offer, senderId) {
        if (!peerConnection) {
            throw new Error('PeerConnection not initialized');
        }
        
        console.log('Setting remote description (offer)');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        console.log('Creating answer');
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('Sending answer to:', senderId);
        sendWebSocketMessage({
            type: 'signal',
            signal_type: 'answer',
            target: senderId,
            payload: answer
        });
    }
    
    // Handle incoming answer
    async function handleAnswer(answer) {
        if (!peerConnection) {
            throw new Error('PeerConnection not initialized');
        }
        
        console.log('Setting remote description (answer)');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
    
    // Handle ICE candidate
    async function handleCandidate(candidate) {
        if (!peerConnection) {
            throw new Error('PeerConnection not initialized');
        }
        
        console.log('Adding ICE candidate');
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    
    // Send WebSocket message
    function sendWebSocketMessage(message) {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            webSocket.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, cannot send message:', message);
        }
    }
    
    // Handle errors
    function handleError(errorMessage) {
        console.error('WebRTC error:', errorMessage);
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('webrtc:error', {
            detail: { message: errorMessage }
        }));
        
        // Display error in console for OBS
        console.error('OBS WebRTC Error:', errorMessage);
    }
    
    // Clean up resources
    function cleanup() {
        console.log('Cleaning up WebRTC resources...');
        
        // Close PeerConnection
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        // Close WebSocket
        if (webSocket) {
            webSocket.close();
            webSocket = null;
        }
        
        // Stop local media tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Clear video sources
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
        
        if (localVideo) {
            localVideo.srcObject = null;
        }
        
        isConnected = false;
        isConnecting = false;
        
        console.log('WebRTC resources cleaned up');
    }
    
    // Public API
    window.WebRTCOBSI = {
        initialize: initialize,
        cleanup: cleanup,
        getConnectionState: () => ({
            isConnected: isConnected,
            isConnecting: isConnecting,
            iceConnectionState: peerConnection ? peerConnection.iceConnectionState : 'closed',
            connectionState: peerConnection ? peerConnection.connectionState : 'closed'
        }),
        getStreams: () => ({
            localStream: localStream,
            remoteStream: remoteStream
        }),
        reconnect: () => {
            reconnectAttempts = 0;
            cleanup();
            setTimeout(initialize, 1000);
        }
    };
    
    // Auto-initialize when script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 1000); // Wait a bit for page to fully load
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
})();