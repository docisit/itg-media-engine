'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PasskeyCredential {
  id: number;
  credential_id: string;
  device_name: string;
  transports: string[];
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://donoconnor.com';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await import('next-auth/react').then((m) => m.getSession());
  const token = (session as any)?.accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${url}`, { ...options, headers });
}

// ---------------------------------------------------------------------------
// Register Passkey Button
// ---------------------------------------------------------------------------

interface RegisterPasskeyProps {
  onRegistered?: () => void;
  className?: string;
}

export function RegisterPasskeyButton({ onRegistered, className }: RegisterPasskeyProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Get registration options from server
      const beginResp = await fetchWithAuth('/api/webauthn/register/begin/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!beginResp.ok) {
        const err = await beginResp.json();
        throw new Error(err.error || 'Failed to start registration');
      }
      const options = await beginResp.json();

      // 2. Create credential via browser API
      const regResp = await startRegistration({
        optionsJSON: options,
        useAutoRegister: false,
      });

      // 3. Send the attestation to the server
      const completeResp = await fetchWithAuth('/api/webauthn/register/complete/', {
        method: 'POST',
        body: JSON.stringify({
          ...regResp,
          device_name: options.device_name || navigator.platform || 'My Passkey',
        }),
      });
      if (!completeResp.ok) {
        const err = await completeResp.json();
        throw new Error(err.error || 'Failed to complete registration');
      }

      const result = await completeResp.json();
      setSuccess(result.message || 'Passkey registered!');
      onRegistered?.();
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleRegister}
        disabled={loading}
        className={
          className ||
          'flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50'
        }
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-blue-600" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.5a2.5 2.5 0 011.5-2.292A5.964 5.964 0 016 7a6 6 0 0112 0z" />
          </svg>
        )}
        {loading ? 'Registering...' : 'Add Passkey'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign In with Passkey Button
// ---------------------------------------------------------------------------

interface SignInWithPasskeyProps {
  className?: string;
}

export function SignInWithPasskeyButton({ className }: SignInWithPasskeyProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Get authentication options from server (no email needed for discoverable credentials)
      const beginResp = await fetch(`${API_BASE}/api/webauthn/auth/begin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!beginResp.ok) {
        const err = await beginResp.json();
        throw new Error(err.error || 'Failed to start authentication');
      }
      const options = await beginResp.json();

      // 2. Get assertion from authenticator
      const authResp = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: false,
      });

      // 3. Send assertion to server for verification
      const completeResp = await fetch(`${API_BASE}/api/webauthn/auth/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResp),
      });
      if (!completeResp.ok) {
        const err = await completeResp.json();
        throw new Error(err.error || 'Authentication failed');
      }

      const { access, refresh, user } = await completeResp.json();

      // 4. Sign in via NextAuth credentials (pass the JWT tokens as credentials)
      const result = await signIn('credentials', {
        username: user.username,
        password: '', // Passkey doesn't need a password
        access_token: access,
        refresh_token: refresh,
        redirect: false,
      });

      if (result?.error) {
        setError('Sign-in failed');
        return;
      }

      router.push('/dashboard');
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('no_passkey');
      } else {
        setError(e.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Track whether to show the no-passkey guide
  const [showNoPasskeyGuide, setShowNoPasskeyGuide] = useState(false);

  // Show the guide when error changes to 'no_passkey'
  if (error === 'no_passkey' && !showNoPasskeyGuide) {
    setShowNoPasskeyGuide(true);
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={loading}
        className={
          className ||
          'flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50'
        }
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a4 4 0 00-4 4v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-2V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2h-4z" fill="currentColor" />
            <circle cx="12" cy="14" r="1.5" fill="white" />
          </svg>
        )}
        {loading ? 'Verifying...' : 'Sign in with Passkey'}
      </button>

      {/* Other errors (network, server, etc.) */}
      {error && error !== 'no_passkey' && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}

      {/* No Passkey Found — Friendly Guide */}
      {showNoPasskeyGuide && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-lg">🔑</span>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-amber-800">
                No passkey found on this device
              </p>
              <p className="text-xs text-amber-700">
                Passkeys must be set up first — you can't sign in with a passkey until
                you register one. Here's what to do:
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-amber-700">
                <li>
                  <strong>Sign in with your username and password</strong> in the form above
                </li>
                <li>
                  Go to your <strong>Profile page</strong> after logging in
                </li>
                <li>
                  Click <strong>"Add Passkey"</strong> to register this device with biometrics
                </li>
                <li>
                  On your next visit, click "Sign in with Passkey" — and you'll skip the
                  password entirely!
                </li>
              </ol>
              <button
                onClick={() => setShowNoPasskeyGuide(false)}
                className="text-xs font-medium text-amber-600 underline hover:text-amber-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manage Passkeys List (for profile page)
// ---------------------------------------------------------------------------

interface ManagePasskeysProps {
  passkeys: PasskeyCredential[];
  onDelete: (credentialId: string) => void;
  loading?: boolean;
}

export function PasskeyList({ passkeys, onDelete, loading }: ManagePasskeysProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (passkeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <svg className="mx-auto h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="mt-3 text-sm text-gray-500">No passkeys registered yet</p>
        <p className="mt-1 text-xs text-gray-400">Add a passkey to sign in with biometrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {passkeys.map((pk) => (
        <div key={pk.credential_id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              {pk.backed_up ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{pk.device_name}</p>
              <p className="text-xs text-gray-500">
                Created {new Date(pk.created_at).toLocaleDateString()}
                {pk.last_used_at && ` · Last used ${new Date(pk.last_used_at).toLocaleDateString()}`}
              </p>
              <div className="mt-1 flex gap-2">
                {pk.backed_up && (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    Synced
                  </span>
                )}
                {pk.transports.includes('internal') && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Built-in
                  </span>
                )}
                {pk.transports.includes('usb') && (
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                    USB Key
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => onDelete(pk.credential_id)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Remove passkey"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Profile Passkey Manager (Register + List)
// ---------------------------------------------------------------------------

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchPasskeys = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetchWithAuth('/api/webauthn/passkeys/');
      if (!resp.ok) throw new Error('Failed to load passkeys');
      const data = await resp.json();
      setPasskeys(data.passkeys || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (credentialId: string) => {
    setDeleteLoading(credentialId);
    try {
      const resp = await fetchWithAuth(`/api/webauthn/passkeys/?credential_id=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
      });
      if (!resp.ok) throw new Error('Failed to delete passkey');
      setPasskeys((prev) => prev.filter((p) => p.credential_id !== credentialId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Fetch on mount
  useState(() => {
    fetchPasskeys();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Passkeys</h3>
          <p className="text-sm text-gray-500">Sign in with your fingerprint, face, or screen lock</p>
        </div>
        <RegisterPasskeyButton onRegistered={fetchPasskeys} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700" />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <PasskeyList passkeys={passkeys} onDelete={handleDelete} loading={loading} />
    </div>
  );
}