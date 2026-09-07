'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('coalintel_token') : null;
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-ash flex items-center justify-center">
      <div className="animate-pulse text-xs font-mono text-amber-500 font-bold uppercase tracking-widest">
        Initializing COALINTEL V2...
      </div>
    </div>
  );
}
