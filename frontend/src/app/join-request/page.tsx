'use client';
import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function JoinRequestPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'athlete',
    school_or_organization: '',
    position_or_sport: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://127.0.0.1:8000'
      : 'https://api.yourdomain.com'
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setServerError('');

    try {
      const response = await fetch(`${apiUrl}/api/join-request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitted(true);
      } else if (data.errors) {
        setErrors(data.errors);
      } else if (data.error) {
        setServerError(data.error);
      } else {
        setServerError('An error occurred. Please try again.');
      }
    } catch (err) {
      setServerError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
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
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4">REQUEST RECEIVED! 🎉</h1>
              <p className="text-emerald-300 text-lg">
                Thanks, <strong className="text-white">{formData.first_name}</strong>! We'll review your request and get back to you at <strong className="text-cyan-400">{formData.email}</strong>.
              </p>
            </div>
          </div>

          <div className="max-w-lg mx-auto py-10 px-6">
            <div className="bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800 text-center space-y-6">
              <div className="text-5xl">📨</div>
              <h2 className="text-2xl font-bold text-white">What Happens Next?</h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold shrink-0">1.</span>
                  <p className="text-zinc-300 text-sm">Our team reviews your request — typically within 24-48 hours.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold shrink-0">2.</span>
                  <p className="text-zinc-300 text-sm">You'll receive an email with an invitation link to create your account.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold shrink-0">3.</span>
                  <p className="text-zinc-300 text-sm">Click the link, set up your profile, and start showcasing your talent!</p>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-800/50 p-4 border border-zinc-700">
                <p className="text-zinc-400 text-sm">
                  📌 <strong className="text-zinc-200">Didn't get a response?</strong> Check your spam folder or contact us at{' '}
                  <a href="mailto:doc@yourdomain.com" className="text-cyan-400 underline hover:text-cyan-300">doc@yourdomain.com</a>
                </p>
              </div>

              <Link
                href="/"
                className="inline-block w-full text-center bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:from-cyan-500 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20"
              >
                ← BACK TO HOME
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black">
        <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-cyan-900 py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">REQUEST TO JOIN</h1>
            <p className="text-cyan-300 text-lg">
              Registration is currently invite-only. Submit a request and our team will reach out to you.
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto py-10 px-6">
          {/* Info banner */}
          <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 rounded-2xl p-5 border border-amber-800/40 mb-8">
            <h3 className="text-lg font-bold text-white mb-2">🔒 Invite-Only Platform</h3>
            <p className="text-amber-200 text-sm leading-relaxed">
              We're currently accepting new members by invitation only. Submit a request below and our team 
              will review your application. If approved, you'll receive an email with an invitation link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-zinc-900/80 p-8 border border-zinc-800 shadow-xl shadow-black/50">
            {serverError && (
              <div className="rounded-lg bg-red-900/50 border border-red-800 p-4 text-sm text-red-300">⚠️ {serverError}</div>
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
                <label htmlFor="first_name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">First Name <span className="text-red-400">*</span></label>
                <input id="first_name" name="first_name" type="text" required value={formData.first_name} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="John" />
                {errors.first_name && <p className="mt-1 text-sm text-red-400">{errors.first_name}</p>}
              </div>
              <div>
                <label htmlFor="last_name" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Last Name <span className="text-red-400">*</span></label>
                <input id="last_name" name="last_name" type="text" required value={formData.last_name} onChange={handleChange}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Doe" />
                {errors.last_name && <p className="mt-1 text-sm text-red-400">{errors.last_name}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Email <span className="text-red-400">*</span></label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="athlete@email.com" />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="school_or_organization" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">School / Organization</label>
              <input id="school_or_organization" name="school_or_organization" type="text" value={formData.school_or_organization} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Your school or organization" />
            </div>

            <div>
              <label htmlFor="position_or_sport" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Position / Sport</label>
              <input id="position_or_sport" name="position_or_sport" type="text" value={formData.position_or_sport} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="e.g., Quarterback, Basketball" />
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Message (optional)</label>
              <textarea id="message" name="message" rows={3} value={formData.message} onChange={handleChange}
                className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition sm:text-sm" placeholder="Tell us a bit about yourself..." />
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-4 py-4 text-base font-black text-white hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 disabled:opacity-50 transition shadow-lg shadow-purple-500/20 tracking-wide">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : '📨 SUBMIT REQUEST'}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-cyan-400 hover:text-cyan-300 transition">Sign in →</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
