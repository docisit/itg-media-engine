'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';

type ConsentStep = 'loading' | 'review' | 'video_chat' | 'signed_form' | 'credit_card' | 'confirmed' | 'error' | 'expired' | 'revoked';

function ParentConsentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [step, setStep] = useState<ConsentStep>('loading');
  const [statusData, setStatusData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [consentMethod, setConsentMethod] = useState<string>('video_chat');
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitRoom, setLiveKitRoom] = useState<string>('');
  const [parentNameDisplay, setParentNameDisplay] = useState('');
  const [childNameDisplay, setChildNameDisplay] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com';

  // Load consent status
  const loadStatus = useCallback(async () => {
    if (!token) {
      setStep('error');
      setErrorMessage('No consent token provided. Please use the link from your email.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/age-gate/parent-consent/status/?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok) {
        setStep('error');
        setErrorMessage(data.error || 'Invalid consent request.');
        return;
      }

      setStatusData(data);

      if (data.status === 'expired') {
        setStep('expired');
      } else if (data.status === 'consent_given') {
        setStep('confirmed');
      } else if (data.status === 'revoked') {
        setStep('revoked');
      } else if (data.status === 'pending') {
        setStep('review');
        setParentNameDisplay(data.parent_name || 'Parent/Guardian');
        setChildNameDisplay(data.child_name || 'your child');
      }
    } catch (err) {
      setStep('error');
      setErrorMessage('Network error. Please try again.');
    }
  }, [token, apiUrl]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Handle consent confirmation
  const handleConfirmConsent = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/age-gate/parent-consent/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_token: token,
          method: consentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('confirmed');
        setStatusData((prev: any) => ({ ...prev, status: 'consent_given' }));
      } else {
        setErrorMessage(data.error || 'Could not confirm consent.');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start video chat verification
  const handleStartVideoChat = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/age-gate/parent-consent/video-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_token: token }),
      });

      const data = await response.json();

      if (response.ok) {
        setLiveKitToken(data.token);
        setLiveKitRoom(data.room);
        setStep('video_chat');
      } else {
        setErrorMessage(data.error || 'Could not start video chat.');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle consent revocation
  const handleRevokeConsent = async () => {
    if (!confirm('Are you sure you want to revoke your consent? Your child\'s account data will be handled per our privacy policy.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/age-gate/parent-consent/revoke/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_token: token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('revoked');
      } else {
        alert(data.error || 'Could not revoke consent.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== LOADING =====
  if (step === 'loading') {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-cyan-400 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-zinc-400">Loading consent request...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== ERROR =====
  if (step === 'error') {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-900/30 border-2 border-red-700 mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Invalid or Expired Link</h1>
            <p className="text-zinc-400 mb-8">{errorMessage}</p>
            <div className="space-y-4">
              <p className="text-zinc-500 text-sm">
                If you believe this is an error, please contact us at{' '}
                <a href="mailto:doc@yourdomain.com" className="text-cyan-400 underline">doc@yourdomain.com</a>
              </p>
              <Link href="/" className="inline-block bg-zinc-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-700 transition">
                ← BACK TO HOME
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== EXPIRED =====
  if (step === 'expired') {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-900/30 border-2 border-amber-700 mb-6">
              <span className="text-4xl">⏰</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Consent Link Expired</h1>
            <p className="text-zinc-400 mb-6">
              This consent request has expired (links expire after 48 hours). 
              Please ask your child to start a new parental consent request from the sign-up page.
            </p>
            <Link href="/" className="inline-block bg-zinc-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-700 transition">
              ← BACK TO HOME
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== REVOKED =====
  if (step === 'revoked') {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border-2 border-zinc-700 mb-6">
              <span className="text-4xl">🗑️</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Consent Revoked</h1>
            <p className="text-zinc-400 mb-6">
              Your parental consent has been revoked. Your child's account data will be handled 
              per our privacy policy. If you have any questions, please contact us.
            </p>
            <Link href="/" className="inline-block bg-zinc-800 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-700 transition">
              ← BACK TO HOME
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== CONFIRMED =====
  if (step === 'confirmed') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900 py-16 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-400 mb-6">
                <span className="text-4xl">✅</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">CONSENT GRANTED!</h1>
              <p className="text-emerald-300 text-lg">
                Thank you for providing parental consent.
              </p>
            </div>
          </div>

          <div className="max-w-lg mx-auto py-10 px-6 space-y-6">
            <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-4">What Happens Next</h2>
              <ul className="space-y-4 text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5">1️⃣</span>
                  <span><strong className="text-white">Account Created</strong> — Your child can now complete their registration and create a profile.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5">2️⃣</span>
                  <span><strong className="text-white">Data Control</strong> — You can review, update, or delete your child's data at any time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5">3️⃣</span>
                  <span><strong className="text-white">Privacy</strong> — We only collect athletic-related information. No personal data is shared with third parties.</span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800 text-center">
              <p className="text-zinc-400 text-sm mb-4">
                You can revoke your consent at any time using the same link from your email.
              </p>
              <button
                onClick={handleRevokeConsent}
                disabled={isSubmitting}
                className="rounded-lg border border-red-800 text-red-400 px-6 py-3 text-sm font-bold hover:bg-red-900/30 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Processing...' : 'Revoke Consent'}
              </button>
            </div>

            <div className="text-center">
              <Link href="/" className="inline-block bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition">
                BACK TO HOME →
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== VIDEO CHAT =====
  if (step === 'video_chat') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 py-16 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl font-black text-white mb-4">📹 Video Verification</h1>
              <p className="text-purple-300">
                A staff member will join you shortly to verify your identity.
              </p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800">
              {liveKitToken ? (
                <div className="space-y-6">
                  <div className="rounded-xl bg-zinc-800/50 p-6 border border-zinc-700">
                    <p className="text-zinc-300 text-sm mb-3">🔗 Your verification room is ready!</p>
                    <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs text-cyan-400 break-all mb-4">
                      Room: {liveKitRoom}
                    </div>
                    <div className="space-y-3">
                      <p className="text-zinc-400 text-sm">You can use this token to connect via a LiveKit client:</p>
                      <div className="bg-zinc-900 rounded-lg p-3 font-mono text-xs text-amber-400 break-all max-h-24 overflow-y-auto">
                        {liveKitToken}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-900/20 border border-blue-800/50 p-4">
                    <p className="text-blue-200 text-xs">
                      💡 Need help connecting? A staff member will reach out via the video room. 
                      If you don't see them right away, they might be in another verification — please wait a moment.
                    </p>
                  </div>

                  <button
                    onClick={handleConfirmConsent}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-base font-black text-white hover:from-emerald-500 hover:to-teal-500 transition"
                  >
                    ✅ VERIFICATION COMPLETE — CONFIRM CONSENT
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="animate-spin h-8 w-8 text-cyan-400 mx-auto mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-zinc-400">Connecting to verification room...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== REVIEW CONSENT REQUEST =====
  return (
    <Layout>
      <div className="min-h-screen bg-black">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 border-2 border-purple-400 mb-6">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">PARENTAL CONSENT</h1>
            <p className="text-purple-300 text-lg">
              Your child wants to join In The Game With Doc
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto py-10 px-6">
          <div className="rounded-2xl bg-zinc-900/80 p-8 border border-zinc-800 shadow-xl shadow-black/50 space-y-6">
            {/* Welcome message */}
            <div className="text-center">
              <p className="text-zinc-300 mb-2">
                Dear <strong className="text-white">{parentNameDisplay}</strong>,
              </p>
              <p className="text-zinc-400 text-sm">
                <strong className="text-cyan-400">{childNameDisplay}</strong> has requested to join our platform — 
                a sports community where athletes showcase their skills, connect with coaches, 
                and track their athletic journey.
              </p>
            </div>

            {/* Information about COPPA */}
            <div className="rounded-xl bg-indigo-900/30 border border-indigo-800/50 p-4 text-sm">
              <h3 className="text-indigo-200 font-medium mb-2">🔒 Your Rights Under COPPA</h3>
              <ul className="text-indigo-300/70 space-y-1 text-xs">
                <li>✅ We need your consent before collecting any data from your child</li>
                <li>✅ You can review what data we've collected at any time</li>
                <li>✅ You can revoke consent and request data deletion at any time</li>
                <li>🔒 We never store driver's licenses or full credit card numbers</li>
                <li>📋 Only athletic-related information is collected (no personal chats, no location tracking)</li>
              </ul>
            </div>

            {/* Choose method */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">
                Choose Verification Method
              </h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setConsentMethod('video_chat')}
                  className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                    consentMethod === 'video_chat'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-2xl">🎥</span>
                  <div className="text-left flex-1">
                    <p className="text-white font-bold text-sm">Video Chat Verification</p>
                    <p className="text-zinc-400 text-xs">Quick identity verification with our staff (recommended)</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    consentMethod === 'video_chat' ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'
                  }`}>
                    {consentMethod === 'video_chat' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsentMethod('signed_form')}
                  className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                    consentMethod === 'signed_form'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-2xl">📝</span>
                  <div className="text-left flex-1">
                    <p className="text-white font-bold text-sm">Signed Consent Form</p>
                    <p className="text-zinc-400 text-xs">Download, sign, and email back a PDF consent form</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    consentMethod === 'signed_form' ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'
                  }`}>
                    {consentMethod === 'signed_form' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsentMethod('credit_card')}
                  className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                    consentMethod === 'credit_card'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-2xl">💳</span>
                  <div className="text-left flex-1">
                    <p className="text-white font-bold text-sm">Credit Card Authorization</p>
                    <p className="text-zinc-400 text-xs">$0.50 micro-transaction to verify identity (<strong className="text-amber-400">amount refunded</strong>)</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    consentMethod === 'credit_card' ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'
                  }`}>
                    {consentMethod === 'credit_card' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Method-specific content */}
            {consentMethod === 'video_chat' && (
              <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700">
                <h4 className="text-white font-medium text-sm mb-2">How video chat works:</h4>
                <ol className="text-zinc-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Click "Start Video Chat" below</li>
                  <li>A LiveKit video room will be created for you</li>
                  <li>A staff member will join to verify your identity</li>
                  <li>After verification, we'll confirm consent</li>
                  <li>The entire call is not recorded — only a log that verification occurred</li>
                </ol>
              </div>
            )}

            {consentMethod === 'signed_form' && (
              <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700">
                <h4 className="text-white font-medium text-sm mb-2">How signed form works:</h4>
                <ol className="text-zinc-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Download the consent form PDF (link provided after clicking continue)</li>
                  <li>Print, sign, and scan (or use digital signature)</li>
                  <li>Email the signed form to <strong className="text-cyan-400">doc@yourdomain.com</strong></li>
                  <li>Our staff will review and confirm within 1-2 business days</li>
                </ol>
              </div>
            )}

            {consentMethod === 'credit_card' && (
              <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700">
                <h4 className="text-white font-medium text-sm mb-2">How credit card works:</h4>
                <ol className="text-zinc-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Click "Proceed to Payment" below</li>
                  <li>A <strong className="text-amber-400">$0.50</strong> micro-transaction will be processed via Stripe</li>
                  <li>This verifies you are a real adult with a valid payment method</li>
                  <li>The <strong className="text-amber-400">$0.50 is fully refunded</strong> immediately</li>
                  <li>We do NOT store your full card number — only Stripe's payment ID for audit purposes</li>
                </ol>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="rounded-lg bg-red-900/50 border border-red-800 p-4 text-sm text-red-300">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {consentMethod === 'video_chat' ? (
                <button
                  onClick={handleStartVideoChat}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 py-4 text-base font-black text-white hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-purple-500/20"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting...
                    </span>
                  ) : (
                    '🎥 START VIDEO CHAT VERIFICATION'
                  )}
                </button>
              ) : (
                <button
                  onClick={handleConfirmConsent}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 py-4 text-base font-black text-white hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-purple-500/20"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `✅ PROVIDE CONSENT VIA ${consentMethod === 'credit_card' ? 'CREDIT CARD' : 'SIGNED FORM'}`
                  )}
                </button>
              )}

              <p className="text-center text-zinc-500 text-xs">
                By providing consent, you agree to our{' '}
                <Link href="/privacy" className="text-cyan-400 underline">Privacy Policy</Link>
                {' '}and confirm you are the parent or legal guardian of the child.
              </p>
            </div>

            {/* Footer info */}
            <div className="border-t border-zinc-800 pt-6 mt-6">
              <p className="text-zinc-600 text-xs text-center">
                Questions? Contact us at{' '}
                <a href="mailto:doc@yourdomain.com" className="text-cyan-400 underline">doc@yourdomain.com</a>
                {' '}| COPPA Compliant | Tennessee Law
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ParentConsentInner;
