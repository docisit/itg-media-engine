"""
WebAuthn / Passkey API Endpoints

Provides biometric/passkey authentication using the webauthn library.
Four endpoints:
  - POST /api/webauthn/register/begin/   — Start passkey registration
  - POST /api/webauthn/register/complete/ — Complete passkey registration
  - POST /api/webauthn/auth/begin/       — Start passkey authentication
  - POST /api/webauthn/auth/complete/    — Complete passkey authentication
"""

import json
import base64
import secrets
from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers import (
    bytes_to_base64url,
    base64url_to_bytes,
    parse_authentication_credential_json,
    parse_registration_credential_json,
)
from webauthn.helpers.exceptions import (
    InvalidRegistrationResponse,
    InvalidAuthenticationResponse,
)
from webauthn.helpers.structs import (
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    AttestationConveyancePreference,
    PublicKeyCredentialDescriptor,
)

from .models import PasskeyCredential


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_rp():
    """Build the Relying Party config from settings."""
    frontend = getattr(settings, 'FRONTEND_URL', 'https://donoconnor.com')
    hostname = frontend.replace('https://', '').replace('http://', '').split(':')[0].rstrip('/')
    return {
        'id': hostname,
        'name': 'ITG Media App',
    }


def _build_jwt_response(user):
    """Return access + refresh tokens with user info."""
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    refresh['username'] = user.username
    refresh['is_staff'] = user.is_staff
    refresh['is_superuser'] = user.is_superuser
    role = getattr(getattr(user, 'profile', None), 'role', 'guest')
    refresh['role'] = role

    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'role': role,
        },
    }


# ---------------------------------------------------------------------------
# REGISTRATION — Begin
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_passkey_begin(request):
    """
    Start passkey registration for the currently authenticated user.
    Returns PublicKeyCredentialCreationOptions for the browser.
    """
    user = request.user

    # Use the email as the WebAuthn user handle (required by spec)
    user_handle = user.email or f"user-{user.id}"

    # Find existing credential IDs to exclude (prevent re-registration)
    exclude_credentials = []
    existing = PasskeyCredential.objects.filter(user=user)
    for cred in existing:
        exclude_credentials.append(
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred.credential_id))
        )

    rp = _get_rp()

    try:
        options = generate_registration_options(
            rp_id=rp['id'],
            rp_name=rp['name'],
            user_id=user_handle,
            user_name=user.username,
            user_display_name=user.username,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            attestation=AttestationConveyancePreference.NONE,
            exclude_credentials=exclude_credentials,
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate registration options: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Store the challenge in the session for verification on completion
    request.session['webauthn_registration_challenge'] = bytes_to_base64url(options.challenge)
    request.session.save()

    return Response({
        'challenge': bytes_to_base64url(options.challenge),
        'rp': {
            'id': rp['id'],
            'name': rp['name'],
        },
        'user': {
            'id': user_handle,
            'name': user.username,
            'displayName': user.username,
        },
        'pubKeyCredParams': [
            {'type': 'public-key', 'alg': -7},   # ES256
            {'type': 'public-key', 'alg': -257}, # RS256
        ],
        'timeout': 60000,
        'attestation': 'none',
        'excludeCredentials': [
            {'id': bytes_to_base64url(base64url_to_bytes(c.credential_id)), 'type': 'public-key'}
            for c in existing
        ],
        'authenticatorSelection': {
            'authenticatorAttachment': 'platform',
            'residentKey': 'preferred',
            'userVerification': 'preferred',
        },
    })


# ---------------------------------------------------------------------------
# REGISTRATION — Complete
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_passkey_complete(request):
    """
    Complete passkey registration. Verifies the authenticator response
    and stores the credential.
    """
    user = request.user
    data = request.data

    expected_challenge_b64 = request.session.get('webauthn_registration_challenge')
    if not expected_challenge_b64:
        return Response(
            {'error': 'No registration challenge found. Start registration first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    expected_challenge = base64url_to_bytes(expected_challenge_b64)
    rp = _get_rp()
    credential_json = json.dumps(data)

    try:
        credential = parse_registration_credential_json(credential_json)
    except Exception as e:
        return Response(
            {'error': f'Invalid credential JSON: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        verification = verify_registration_response(
            credential=RegistrationCredential(
                id=credential.id,
                raw_id=credential.raw_id,
                response=credential.response,
                client_extension_results=credential.client_extension_results,
                type=credential.type,
                authenticator_attachment=credential.authenticator_attachment,
            ),
            expected_challenge=expected_challenge,
            expected_rp_id=rp['id'],
            expected_origin=settings.FRONTEND_URL,
            require_user_verification=False,
        )
    except InvalidRegistrationResponse as e:
        return Response(
            {'error': f'Registration verification failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {'error': f'Unexpected error during verification: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Decode the credential public key for storage
    import struct
    from webauthn.helpers import base64url_to_bytes as b64url_decode
    pkey = verification.credential_public_key

    # Store as PEM for human readability and easy retrieval
    try:
        from cryptography.hazmat.primitives.serialization import (
            Encoding, PublicFormat, PrivateFormat, NoEncryption,
        )
        # Get the raw public key bytes and encode as base64 for transport
        public_key_b64 = bytes_to_base64url(pkey)
    except Exception:
        public_key_b64 = bytes_to_base64url(pkey)

    # Save the credential
    device_name = data.get('device_name', '')
    transports = data.get('transports', [])

    PasskeyCredential.objects.create(
        user=user,
        credential_id=bytes_to_base64url(verification.credential_id),
        credential_public_key=public_key_b64,
        sign_count=verification.sign_count,
        transports=transports,
        device_name=device_name,
        backed_up=verification.credential_backed_up,
    )

    # Clear the challenge
    request.session.pop('webauthn_registration_challenge', None)
    request.session.save()

    return Response({
        'status': 'ok',
        'message': 'Passkey registered successfully.',
        'device_name': device_name or 'Passkey',
    })


# ---------------------------------------------------------------------------
# AUTHENTICATION — Begin
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def authenticate_passkey_begin(request):
    """
    Start passkey authentication. Optionally pass 'email' to look up
    credentials for a specific user. Returns PublicKeyCredentialRequestOptions.
    """
    email = request.data.get('email', '').strip().lower()

    if email:
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No account found with that email.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        credentials = PasskeyCredential.objects.filter(user=user)
    else:
        # When no email provided, return empty options — browser will
        # prompt the user to select a passkey via the platform UI
        user = None
        credentials = PasskeyCredential.objects.none()

    rp = _get_rp()

    allow_credentials = []
    for cred in credentials:
        allow_credentials.append(
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred.credential_id))
        )

    try:
        options = generate_authentication_options(
            rp_id=rp['id'],
            timeout=60000,
            user_verification=UserVerificationRequirement.PREFERRED,
            allow_credentials=allow_credentials if allow_credentials else None,
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate authentication options: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Store the challenge in the session
    request.session['webauthn_auth_challenge'] = bytes_to_base64url(options.challenge)
    if user:
        request.session['webauthn_auth_user_id'] = user.id
    request.session.save()

    response_data = {'challenge': bytes_to_base64url(options.challenge)}

    if allow_credentials:
        response_data['allowCredentials'] = [
            {'id': bytes_to_base64url(base64url_to_bytes(c.credential_id)), 'type': 'public-key'}
            for c in credentials
        ]

    return Response(response_data)


# ---------------------------------------------------------------------------
# AUTHENTICATION — Complete
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def authenticate_passkey_complete(request):
    """
    Complete passkey authentication. Verifies the authenticator assertion
    and returns JWT tokens on success.
    """
    data = request.data
    expected_challenge_b64 = request.session.get('webauthn_auth_challenge')

    if not expected_challenge_b64:
        return Response(
            {'error': 'No authentication challenge found. Start authentication first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    expected_challenge = base64url_to_bytes(expected_challenge_b64)
    rp = _get_rp()
    credential_json = json.dumps(data)

    try:
        credential = parse_authentication_credential_json(credential_json)
    except Exception as e:
        return Response(
            {'error': f'Invalid credential JSON: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Look up the stored credential
    credential_id_b64 = bytes_to_base64url(credential.raw_id)
    try:
        stored_credential = PasskeyCredential.objects.get(credential_id=credential_id_b64)
    except PasskeyCredential.DoesNotExist:
        return Response(
            {'error': 'Passkey not recognized. Please register this device first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Decode the stored public key
    try:
        credential_public_key = base64url_to_bytes(stored_credential.credential_public_key)
    except Exception:
        return Response(
            {'error': 'Stored credential is corrupt. Please re-register.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        verification = verify_authentication_response(
            credential=AuthenticationCredential(
                id=credential.id,
                raw_id=credential.raw_id,
                response=credential.response,
                authenticator_attachment=credential.authenticator_attachment,
                client_extension_results=credential.client_extension_results,
                type=credential.type,
            ),
            expected_challenge=expected_challenge,
            expected_rp_id=rp['id'],
            expected_origin=settings.FRONTEND_URL,
            credential_public_key=credential_public_key,
            credential_current_sign_count=stored_credential.sign_count,
            require_user_verification=False,
        )
    except InvalidAuthenticationResponse as e:
        return Response(
            {'error': f'Authentication verification failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {'error': f'Unexpected error during verification: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update sign count and last used timestamp
    stored_credential.sign_count = verification.new_sign_count
    stored_credential.last_used_at = datetime.now(timezone.utc)
    stored_credential.save(update_fields=['sign_count', 'last_used_at'])

    # Clear the challenge
    request.session.pop('webauthn_auth_challenge', None)
    request.session.pop('webauthn_auth_user_id', None)
    request.session.save()

    # Return JWT tokens
    tokens = _build_jwt_response(stored_credential.user)

    return Response({
        'status': 'ok',
        **tokens,
    })


# ---------------------------------------------------------------------------
# List and Delete Passkeys
# ---------------------------------------------------------------------------

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_passkeys(request):
    """
    GET  — list all passkeys for the authenticated user.
    DELETE — delete a passkey by credential_id (passed as query param or body).
    """
    user = request.user

    if request.method == 'GET':
        credentials = PasskeyCredential.objects.filter(user=user)
        return Response({
            'passkeys': [
                {
                    'id': c.id,
                    'credential_id': c.credential_id,
                    'device_name': c.device_name or 'Unnamed passkey',
                    'transports': c.transports,
                    'backed_up': c.backed_up,
                    'created_at': c.created_at.isoformat(),
                    'last_used_at': c.last_used_at.isoformat() if c.last_used_at else None,
                }
                for c in credentials
            ],
            'count': credentials.count(),
        })

    if request.method == 'DELETE':
        credential_id = request.data.get('credential_id') or request.query_params.get('credential_id')
        if not credential_id:
            return Response(
                {'error': 'credential_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            cred = PasskeyCredential.objects.get(credential_id=credential_id, user=user)
            cred.delete()
            return Response({'status': 'ok', 'message': 'Passkey deleted.'})
        except PasskeyCredential.DoesNotExist:
            return Response(
                {'error': 'Passkey not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )