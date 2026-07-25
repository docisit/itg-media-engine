'use client';
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Layout from '@/components/Layout';

interface GuestRequestForm {
  name: string;
  email: string;
  phone: string;
  hudl: string;
  maxpreps: string;
  bio: string;
  role: 'athlete' | 'coach' | 'other';
}

export default function GuestRequest() {
  const [formData, setFormData] = useState<GuestRequestForm>({ 
    name: '', 
    email: '', 
    phone: '',
    hudl: '', 
    maxpreps: '',
    bio: '',
    role: 'athlete' as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await axios.post(`${API_BASE}/api/guest-requests/`, formData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      setIsSent(true);
      setFormData({ name: '', email: '', phone: '', hudl: '', maxpreps: '', bio: '', role: 'athlete' as const });
    } catch (error: any) {
      console.error('Error submitting request:', error);
      if (error.response) {
        alert(`Error ${error.response.status}: ${error.response.data?.detail || 'Unable to submit request'}`);
      } else if (error.request) {
        alert("Network error: Cannot connect to server. Please check if Django is running.");
      } else {
        alert("Error sending request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isSent) {
    return (
      <Layout>
        <div className="min-h-screen bg-black text-white flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-black mb-4 text-cyan-400">Application Submitted!</h1>
              <p className="text-zinc-400 mb-4">
                <strong>Important:</strong> We've sent a verification email to <span className="text-cyan-300">{formData.email}</span>.
              </p>
              <p className="text-zinc-400 mb-4">
                Please check your email and click the verification link to complete your application.
              </p>
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300">
                  💡 <strong>Note:</strong> Your application will not be reviewed until your email is verified.
                </p>
              </div>
              <p className="text-zinc-400 mb-6">
                After verification, DOC will review your submission and get back to you soon with your guest portal access.
              </p>
              <Link href="/" className="bg-cyan-600 text-black px-6 py-3 rounded-xl font-bold hover:bg-cyan-400 transition">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Join The DOC Show</h1>
          <p className="text-xl text-purple-300">
            Submit your application to be featured on our show. Athletes and Coaches welcome!
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full py-12 px-6">
        <form onSubmit={handleSubmit} className="bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Full Name *</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="John Smith"
                  value={formData.name}
                  className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Email *</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                placeholder="(123) 456-7890"
                value={formData.phone}
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                onChange={handleChange}
              />
              <p className="text-xs text-zinc-500 mt-1">Optional - for verification purposes only</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Role *</label>
              <select 
                name="role"
                value={formData.role}
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white"
                onChange={handleChange}
                required
              >
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Hudl Highlight Link</label>
              <input 
                type="url" 
                name="hudl"
                placeholder="https://www.hudl.com/..."
                value={formData.hudl}
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">MaxPreps Profile</label>
              <input 
                type="url" 
                name="maxpreps"
                placeholder="https://www.maxpreps.com/..."
                value={formData.maxpreps}
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase mb-2">Bio/Introduction *</label>
              <textarea 
                name="bio"
                placeholder="Tell us about yourself, your achievements, and why you want to be on the show..."
                value={formData.bio}
                rows={5}
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-black font-black py-4 rounded-xl mt-8 transition-colors"
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
          </button>
          
          <p className="text-center text-sm text-zinc-500 mt-4">
            After review, you&apos;ll receive access to your guest portal with VDO.Ninja room and Coturn credentials.
          </p>
        </form>

        <div className="mt-12 bg-blue-900/20 border border-blue-600/30 rounded-2xl p-6">
          <h3 className="font-bold text-cyan-400 mb-3">💡 What Happens Next?</h3>
          <ul className="space-y-2 text-zinc-300 text-sm">
            <li>✓ We review your application and film</li>
            <li>✓ You receive your guest portal login</li>
            <li>✓ Connect via VDO.Ninja with secure Coturn credentials</li>
            <li>✓ Join the broadcast and share your story!</li>
          </ul>
        </div>
      </main>
      </div>
    </Layout>
  );
}