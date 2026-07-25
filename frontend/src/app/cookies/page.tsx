'use client';
import Layout from '@/components/Layout';

export default function CookiesPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-black text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">Cookie Policy</h1>
            <p className="text-zinc-400 text-lg">How we use cookies on our platform</p>
          </div>

          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800">
            <div className="prose prose-invert max-w-none">
              <p className="text-zinc-300 mb-6">
                This cookie policy will be available soon. We believe in transparency about 
                how we use cookies and similar technologies to enhance your experience.
              </p>
              
              <p className="text-zinc-300 mb-6">
                Our platform uses minimal cookies necessary for functionality and security. 
                We do not use cookies for tracking or advertising purposes.
              </p>

              <div className="mt-8 p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                <h3 className="text-lg font-bold text-green-400 mb-2">Our Cookie Philosophy</h3>
                <ul className="text-zinc-300 space-y-2">
                  <li>• Only essential cookies for platform operation</li>
                  <li>• No third-party tracking cookies</li>
                  <li>• Clear consent mechanism for optional cookies</li>
                  <li>• Easy cookie management options</li>
                  <li>• Regular privacy compliance reviews</li>
                </ul>
              </div>

              <p className="text-zinc-300 mt-6">
                For questions about our cookie usage, contact{' '}
                <a href="mailto:doc@yourdomain.com" className="text-cyan-400 hover:text-cyan-300">
                  doc@yourdomain.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a href="/contact" className="text-cyan-400 hover:text-cyan-300 transition">
              Contact us about cookie preferences
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}