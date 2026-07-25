import { Suspense } from 'react';
import ParentConsentContent from './ParentConsentContent';
import Layout from '@/components/Layout';

export default function ParentConsentPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-cyan-400 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-zinc-400">Loading consent page...</p>
          </div>
        </div>
      </Layout>
    }>
      <ParentConsentContent />
    </Suspense>
  );
}
