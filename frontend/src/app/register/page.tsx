'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { Turnstile } from '@marsidev/react-turnstile';

type RegisterStep = 'age-gate' | 'registration' | 'parent-consent' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('age-gate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [turnstileError, setTurnstileError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [ageGateMessage, setAgeGateMessage] = useState('');

  // Parent consent flow state
  const [parentConsentSent, setParentConsentSent] = useState(false);
  const [parentConsentToken, setParentConsentToken] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'athlete',
    first_name: '',
    last_name: '',
    school_name: '',
    position: '',
    graduation_year: '',
    website: '', // honeypot — hidden from real users
    date_of_birth: '',
  });

  // Separate parent consent fields
  const [parentConsent, setParentConsent] = useState({
    child_name: '',
    child_email: '',
    parent_email: '',
    parent_name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleParentConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParentConsent(prev => ({ ...prev, [name]: value }));
  };

  const turnstileRef = useRef<any>(null);

  const handleTurnstileError = () => {
    console.warn('Turnstile failed to load');
    setTurnstileError(true);
    setTurnstileLoaded(true);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:8000'
      : 'https://api.yourdomain.com'
  );

  // ===== AGE GATE CHECK =====
  const handleAgeGateCheck = async () => {
    const dob = formData.date_of_birth;
    if (!dob) {
      setErrors({ date_of_birth: 'Please enter your date of birth.' });
      return;
    }

    // Basic client-side validation — server enforces the real check
    setErrors({});

    try {
      const response = await fetch(`${apiUrl}/api/age-gate/check/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: dob }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ date_of_birth: data.error || 'Could not verify age.' });
        return;
      }

      if (data.is_underage) {
        setAgeGateMessage(`You are ${data.age} years old. You need a parent or guardian to set up your account.`);
        setStep('parent-consent');
      } else {
        setAgeGateMessage(`You are ${data.age} years old. You're eligible to create an account!`);
        setStep('registration');
      }
    } catch (err) {
      setErrors({ date_of_birth: 'Network error. Please try again.' });
    }
  };

  // ===== PARENT CONSENT INITIATE =====
  const handleParentConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(`${apiUrl}/api/age-gate/parent-consent/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: parentConsent.child_name,
          child_email: parentConsent.child_email,
          parent_email: parentConsent.parent_email,
          parent_name: parentConsent.parent_name,
          child_dob: formData.date_of_birth,
          method: 'video_chat',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setParentConsentSent(true);
        setParentConsentToken(data.consent_token || '');
      } else {
        setErrors({ general: data.error || 'Could not send consent request.' });
      }
    } catch (err) {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== REGISTRATION SUBMIT =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken && !turnstileError) {
      setErrors({ turnstile: 'Please complete the security check.' });
      return;
    }

    const effectiveToken = turnstileToken || 'bypass-turnstile-failed';

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(`${apiUrl}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cf_turnstile_token: effectiveToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setRegisteredEmail(formData.email);
        setStep('success');
      } else if (data.error === 'registration_disabled') {
        // Registration is invite-only — redirect to join request page
        router.push('/join-request');
        return;
      } else if (data.error === 'age_gate_blocked') {
        setErrors({ general: data.message || 'Age requirement not met.' });
        setStep('parent-consent');
      } else if (data.errors) {
        setErrors(data.errors);
      } else if (data.error) {
        setErrors({ general: data.error });
      }
    } catch (err) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== SUCCESS SCREEN =====
  if (step === 'success' || success) {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="bg-gradient-to-r from-emerald-900 to-cyan-900 py-16 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-400 mb-6">
                <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">ACCOUNT CREATED! 🎉</h1>
              <p className="text-emerald-300 text-lg">
                Welcome to the team — you're now part of the <strong className="text-white">Donnie DOC O'Connor</strong> elite athlete community!
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto py-10 px-6 space-y-8">
            <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800 text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
              <p className="text-zinc-400 mb-4">
                We sent a verification link to <strong className="text-cyan-400">{registeredEmail}</strong>
              </p>
              <p className="text-zinc-500 text-sm mb-6">
                Click the link in the email to activate your account, then log in and complete your profile.
              </p>
              
              <div className="rounded-xl bg-zinc-800/50 p-4 text-sm border border-zinc-700">
                <p className="text-zinc-300 font-medium mb-1">📌 Didn't get the email?</p>
                <p className="text-zinc-500">
                  Check your spam folder, or{' '}
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${apiUrl}/api/resend-verification/`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: registeredEmail }),
                        });
                        alert('Verification email resent!');
                      } catch {
                        alert('Failed to resend. Please try again.');
                      }
                    }}
                    className="text-cyan-400 underline hover:text-cyan-300 transition"
                  >
                    click to resend
                  </button>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 rounded-2xl p-8 border border-cyan-800/50 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20">⚡</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Complete Your Profile</h3>
                  <p className="text-cyan-200 text-sm">
                    Your journey doesn't stop here! After verifying your email, log in and 
                    <strong className="text-white"> build your full athlete or coach profile</strong> — 
                    add stats, photos, highlights, and get discovered by college recruiters.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="flex-1 text-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:from-cyan-500 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20"
              >
                GO TO LOGIN →
              </Link>
              <Link
                href="/"
                className="flex-1 text-center border border-zinc-700 text-zinc-300 px-8 py-4 rounded-xl font-bold hover:border-cyan-500 hover:text-cyan-400 transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== PARENT CONSENT FLOW =====
  if (step === 'parent-consent') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 py-16 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 border-2 border-purple-400 mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">PARENTAL CONSENT REQUIRED</h1>
              <p className="text-purple-300 text-lg">
                You indicated you are under 13. A parent or guardian needs to help set up your account.
              </p>
            </div>
          </div>

          <div className="max-w-lg mx-auto py-10 px-6">
            {parentConsentSent ? (
              <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800 text-center space-y-6">
                <div className="text-6xl">📨</div>
                <h2 className="text-2xl font-bold text-white">Consent Request Sent!</h2>
                <p className="text-zinc-400">
                  We've sent an email to <strong className="text-purple-400">{parentConsent.parent_email}</strong>
                  {' '}with instructions on how to provide consent.
                </p>
                <p className="text-zinc-500 text-sm">
                  The consent link will expire in 48 hours. You can also use this link to check status:
                </p>
                {parentConsentToken && (
                  <div className="rounded-xl bg-zinc-800/50 p-4 text-sm border border-zinc-700">
                    <p className="text-zinc-400 mb-2">Your consent reference:</p>
                    <p className="text-cyan-400 font-mono text-xs break-all">
                      {parentConsentToken}
                    </p>
                  </div>
                )}
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-black hover:from-purple-500 hover:to-blue-500 transition"
                >
                  ← BACK TO HOME
                </Link>
              </div>
            ) : (
              <form onSubmit={handleParentConsentSubmit} className="space-y-6 rounded-2xl bg-zinc-900/80 p-8 border border-zinc-800 shadow-xl shadow-black/50">
                {errors.general && (
                  <div className="rounded-lg bg-red-900/50 border border-red-800 p-4 text-sm text-red-300">⚠️ {errors.general}</div>
                )}

                {/* Info banner */}
                <div className="rounded-xl bg-indigo-900/30 border border-indigo-800/50 p-4 text-sm">
                  <p className="text-indigo-200 font-medium mb-2">👋 How this works:</p>
                  <ul className="text-indigo-300/70 space-y-1 text-xs">
                    <li>✅ We'll send a consent request to your parent's email</li>
                    <li>✅ Your parent can verify via video chat, signed form, or credit card</li>
                    <li>✅ No data is saved until consent is granted</li>
                    <li>🔒 We NEVER store driver's licenses or full credit card numbers</li>
                  </ul>
                </div>

                <div className="text-sm text-zinc-500 text-center -mb-2">
                  {ageGateMessage}
                </div>

                {/* Child info */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Child's First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="child_name"
                    type="text"
                    required
                    value={parentConsent.child_name}
                    onChange={handleParentConsentChange}
                    placeholder="Child's first name"
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Child's Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="child_email"
                    type="email"
                    required
                    value={parentConsent.child_email}
                    onChange={handleParentConsentChange}
                    placeholder="child@email.com"
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition sm:text-sm"
                  />
                </div>

                {/* Parent info */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Parent/Guardian Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="parent_name"
                    type="text"
                    required
                    value={parentConsent.parent_name}
                    onChange={handleParentConsentChange}
                    placeholder="Parent's full name"
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Parent/Guardian Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="parent_email"
                    type="email"
                    required
                    value={parentConsent.parent_email}
                    onChange={handleParentConsentChange}
                    placeholder="parent@email.com"
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition sm:text-sm"
                  />
                </div>

                {/* Consent methods info */}
                <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700">
                  <p className="text-zinc-300 font-medium text-sm mb-3">Choose a verification method (parent will decide):</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-lg bg-zinc-700/30 p-3">
                      <span className="text-lg">🎥</span>
                      <div className="flex-1">
                        <p className="text-zinc-200 font-medium text-xs">Video Chat Verification</p>
                        <p className="text-zinc-500 text-xs">Quick call with our staff — our recommended method</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-zinc-700/30 p-3">
                      <span className="text-lg">📝</span>
                      <div className="flex-1">
                        <p className="text-zinc-200 font-medium text-xs">Signed Consent Form</p>
                        <p className="text-zinc-500 text-xs">Download, sign, and return a consent form</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-zinc-700/30 p-3">
                      <span className="text-lg">💳</span>
                      <div className="flex-1">
                        <p className="text-zinc-200 font-medium text-xs">Credit Card Authorization</p>
                        <p className="text-zinc-500 text-xs">$0.50 micro-transaction to verify identity</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-4 py-4 text-base font-black text-white hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 transition shadow-lg shadow-purple-500/20 tracking-wide"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending Request...
                    </span>
                  ) : (
                    '📨 SEND CONSENT REQUEST TO PARENT'
                  )}
                </button>

                <p className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('age-gate')}
                    className="text-zinc-500 text-sm hover:text-zinc-300 transition"
                  >
                    ← Go back
                  </button>
                </p>
              </form>
            )}

            <footer className="border-t border-zinc-900 pt-8 mt-8 text-center">
              <p className="text-zinc-600 text-xs font-mono tracking-widest uppercase">
                © 2026 Donnie DOC OConnor Media • COPPA Compliant
              </p>
            </footer>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== AGE GATE STEP =====
  if (step === 'age-gate') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="bg-gradient-to-r from-blue-900 via-cyan-900 to-emerald-900 py-16 px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">WELCOME TO THE GAME</h1>
              <p className="text-cyan-300 text-lg">
                First, let's check your eligibility
              </p>
            </div>
          </div>

          <div className="max-w-md mx-auto py-10 px-6">
            <div className="rounded-2xl bg-zinc-900/80 p-8 border border-zinc-800 shadow-xl shadow-black/50">
              <div className="text-center mb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
                  <span className="text-3xl">🎂</span>
                </div>
                <h2 className="text-2xl font-bold text-white">When were you born?</h2>
                <p className="text-zinc-400 text-sm mt-2">
                  We need your date of birth to verify you're eligible to create an account.
                  This information is never shared publicly.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="date_of_birth" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Date of Birth <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm"
                  />
                  {errors.date_of_birth && (
                    <p className="mt-2 text-sm text-red-400">{errors.date_of_birth}</p>
                  )}
                </div>

                <p className="text-xs text-zinc-500 text-center mt-2">
                  🔒 By proceeding, you agree to our{' '}
                  <Link href="/privacy" className="text-cyan-400 underline hover:text-cyan-300">Privacy Policy</Link>
                  {' '}and{' '}
                  <Link href="/terms" className="text-cyan-400 underline hover:text-cyan-300">Terms of Service</Link>
                </p>

                <button
                  type="button"
                  onClick={handleAgeGateCheck}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-4 py-4 text-base font-black text-white hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 transition shadow-lg shadow-cyan-500/20 tracking-wide"
                >
                  CONTINUE →
                </button>

                <p className="text-center">
                  <Link href="/" className="text-zinc-500 text-sm hover:text-zinc-300 transition">
                    ← Back to home
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ===== REGISTRATION FORM =====
  return (
    <Layout>
      <div className="min-h-screen bg-black">
        <div className="bg-gradient-to-r from-blue-900 via-cyan-900 to-emerald-900 py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">CREATE YOUR ACCOUNT</h1>
            <p className="text-cyan-300 text-lg">
              Join the elite athlete community — connect with college coaches and showcase your talent
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span className="text-emerald-400 font-bold text-sm">ATHLETES</span>
              </div>
              <span className="text-zinc-500">•</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧑‍🏫</span>
                <span className="text-cyan-400 font-bold text-sm">COACHES</span>
              </div>
              <span className="text-zinc-500">•</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span className="text-amber-400 font-bold text-sm">RECRUITERS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto py-10 px-6">
          {/* Age verification badge */}
          <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-2xl p-4 border border-cyan-800/30 mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-cyan-200 text-sm font-medium">Age Verified</p>
              <p className="text-cyan-400/60 text-xs">{ageGateMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep('age-gate')}
              className="ml-auto text-xs text-cyan-500 hover:text-cyan-400 underline"
            >
              Change
            </button>
          </div>

          {/* Profile Completion Info Box */}
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 rounded-2xl p-5 border border-amber-800/40 mb-8 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">⚡</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Complete Your Profile After Registering</h3>
                <p className="text-amber-200 text-sm leading-relaxed">
                  First, create your account below. Then after verifying your email, you'll be able to 
                  <strong className="text-white"> add your stats, upload photos, list your achievements,</strong> and build a 
                  standout profile that college coaches will see!
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-zinc-900/80 p-8 border border-zinc-800 shadow-xl shadow-black/50">
            {errors.general && (
              <div className="rounded-lg bg-red-900/50 border border-red-800 p-4 text-sm text-red-300">⚠️ {errors.general}</div>
            )}

            {/* Role selector */}
            <div>
              <label className="block text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'athlete' }))}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 transition-all duration-200 ${
                    formData.role === 'athlete'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-500/10'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-3xl">🏃</span>
                  <span className="font-black text-lg">Athlete</span>
                  <span className="text-xs opacity-70">Showcase your talent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'coach' }))}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 transition-all duration-200 ${
                    formData.role === 'coach'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="text-3xl">🧑‍🏫</span>
                  <span className="font-black text-lg">Coach</span>
                  <span className="text-xs opacity-70">Discover talent</span>
                </button>
              </div>
              {errors.role && <p className="mt-2 text-sm text-red-400">{errors.role}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">First Name</label>
                <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="John" />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Last Name</label>
                <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Doe" />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Username <span className="text-red-400">*</span></label>
              <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="your_username" />
              {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Email <span className="text-red-400">*</span></label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="athlete@school.edu" />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Password <span className="text-red-400">*</span></label>
                <input id="password" name="password" type="password" required minLength={8} value={formData.password} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="At least 8 characters" />
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Confirm <span className="text-red-400">*</span></label>
                <input id="confirm_password" name="confirm_password" type="password" required value={formData.confirm_password} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Repeat password" />
                {errors.confirm_password && <p className="mt-1 text-sm text-red-400">{errors.confirm_password}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="school_name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">School Name</label>
                <input id="school_name" name="school_name" type="text" value={formData.school_name} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Your high school" />
              </div>
              <div>
                <label htmlFor="graduation_year" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Grad Year</label>
                <input id="graduation_year" name="graduation_year" type="number" min={2024} max={2032} value={formData.graduation_year} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="2026" />
              </div>
            </div>

            <div>
              <label htmlFor="position" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Position / Sport</label>
              <input id="position" name="position" type="text" value={formData.position} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="e.g., Quarterback, Point Guard" />
            </div>

            {/* Honeypot */}
            <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={formData.website} onChange={handleChange} />
            </div>

            {/* Turnstile */}
            <div className="w-full overflow-hidden">
              {turnstileError ? (
                <div className="rounded-xl bg-amber-900/30 border border-amber-800/50 p-4 text-center">
                  <p className="text-sm text-amber-300 font-medium mb-2">⚠️ Security check could not load</p>
                  <p className="text-xs text-amber-400/70 mb-3">This may be caused by ad blockers or network restrictions.</p>
                  <button type="button" onClick={() => { setTurnstileError(false); setTurnstileLoaded(false); setErrors(prev => { const copy = { ...prev }; delete copy.turnstile; return copy; }); }}
                    className="rounded-lg bg-amber-600/80 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 transition">🔄 Retry Security Check</button>
                </div>
              ) : (
                <div className="flex justify-center min-h-[65px]">
                  {!turnstileLoaded && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading security check...
                    </div>
                  )}
                  <div className={turnstileLoaded ? '' : 'absolute opacity-0 pointer-events-none'}>
                    <Turnstile
                      key={turnstileError ? 'retry' : 'initial'}
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                      onSuccess={(token) => { setTurnstileToken(token); setTurnstileLoaded(true); if (errors.turnstile) { setErrors(prev => { const copy = { ...prev }; delete copy.turnstile; return copy; }); } }}
                      onLoad={() => setTurnstileLoaded(true)}
                      onError={() => handleTurnstileError()}
                      options={{ theme: 'dark' }}
                    />
                  </div>
                </div>
              )}
            </div>
            {errors.turnstile && <p className="text-center text-sm text-red-400">{errors.turnstile}</p>}

            <button type="submit" disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-4 py-4 text-base font-black text-white hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 disabled:opacity-50 transition shadow-lg shadow-cyan-500/20 tracking-wide">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </span>
              ) : '🚀 CREATE ACCOUNT'}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-cyan-400 hover:text-cyan-300 transition">Sign in →</Link>
          </p>
        </div>

        <footer className="border-t border-zinc-900 py-8 px-6 text-center">
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">
            © 2026 Donnie DOC OConnor Media • Elite Athlete Community
          </p>
        </footer>
      </div>
    </Layout>
  );
}
