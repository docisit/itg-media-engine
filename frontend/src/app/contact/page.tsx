'use client';
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface ContactForm {
  name: string;
  email: string;
  message: string;
  type: 'general' | 'tech-support' | 'media-inquiry';
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    message: '',
    type: 'general' as ContactForm['type']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Map frontend 'type' field to backend 'inquiry_type' field
      const payload = {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        inquiry_type: formData.type
      };
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/contact/`, payload);
      setIsSent(true);
      setFormData({ name: '', email: '', message: '', type: 'general' as ContactForm['type'] });
    } catch {
      alert('Error sending message. Please try again or email doc@yourdomain.com directly.');
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
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Navigation */}
        <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-black text-cyan-500">DOC</Link>
            <div className="flex gap-6">
              <Link href="/" className="text-zinc-400 hover:text-white transition">Home</Link>
              <Link href="/shows" className="text-zinc-400 hover:text-white transition">Shows</Link>
              <Link href="/media" className="text-zinc-400 hover:text-white transition">Media</Link>
              <Link href="/profiles" className="text-zinc-400 hover:text-white transition">Profiles</Link>
            </div>
          </div>
        </nav>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-black mb-4">Message Sent!</h1>
            <p className="text-zinc-400 mb-6">
              Thanks for reaching out! DOC will get back to you soon.
            </p>
            <Link href="/" className="bg-cyan-600 text-black px-6 py-3 rounded-xl font-bold hover:bg-cyan-400 transition">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-cyan-500">DOC</Link>
          <div className="flex gap-6">
            <Link href="/" className="text-zinc-400 hover:text-cyan-400 transition font-medium">Home</Link>
            <Link href="/shows" className="text-zinc-400 hover:text-cyan-400 transition font-medium">Shows</Link>
            <Link href="/media" className="text-zinc-400 hover:text-cyan-400 transition font-medium">Media</Link>
            <Link href="/profiles" className="text-zinc-400 hover:text-cyan-400 transition font-medium">Profiles</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-cyan-900 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Get In Touch</h1>
          <p className="text-xl text-cyan-300">
            Collaborations, technical support, or media inquiries
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full py-12 px-6">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
            <div className="text-4xl mb-3">🎙️</div>
            <h3 className="font-bold mb-2 text-cyan-400">Guest Inquiries</h3>
            <p className="text-sm text-zinc-400 mb-4">Interested in being a guest on the show?</p>
            <Link href="/request" className="text-cyan-500 font-medium hover:text-cyan-400 transition">
              Apply Here →
            </Link>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="font-bold mb-2 text-cyan-400">Tech Support</h3>
            <p className="text-sm text-zinc-400 mb-4">Having issues with VDO.Ninja or streaming?</p>
            <a 
              href="https://vdo.yourdomain.com/check.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 font-medium hover:text-cyan-400 transition"
            >
              Run Diagnostic →
            </a>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-center">
            <div className="text-4xl mb-3">📺</div>
            <h3 className="font-bold mb-2 text-cyan-400">Live Status</h3>
            <p className="text-sm text-zinc-400 mb-4">Check if we&apos;re live broadcasting now</p>
            <Link href="/" className="text-cyan-500 font-medium hover:text-cyan-400 transition">
              View Live Status →
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 shadow-2xl rounded-2xl p-8 border border-zinc-800 mb-12">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-zinc-400 uppercase mb-2">Full Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-zinc-400 uppercase mb-2">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="type" className="block text-sm font-bold text-zinc-400 uppercase mb-2">Inquiry Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white"
              title="Select inquiry type"
            >
              <option value="general">General Inquiry</option>
              <option value="tech-support">Technical Support</option>
              <option value="media-inquiry">Media Collaboration</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-bold text-zinc-400 uppercase mb-2">Message *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              className="w-full p-3 border border-zinc-700 rounded-lg bg-black focus:border-cyan-500 focus:outline-none transition-colors text-white placeholder-zinc-500"
              placeholder="Tell us about your project, technical issue, or collaboration idea..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-black font-black py-4 rounded-xl transition duration-200"
          >
            {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'}
          </button>

          <div className="mt-6 text-center text-sm text-zinc-500">
            <p>Or email directly: <a href="mailto:doc@yourdomain.com" className="text-cyan-500 hover:text-cyan-400">doc@yourdomain.com</a></p>
            <p className="mt-2">Technical issues? Include your system details for faster resolution.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
