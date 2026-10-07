'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Issue #65: httpOnly cookie session — probe the server for auth state
    apiClient
      .get('/auth/me')
      .then(() => router.replace('/dashboard'))
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0E1113] flex items-center justify-center">
      <div className="animate-pulse text-xs font-mono text-[#C58B3A] font-bold uppercase tracking-widest">
        Initializing COALINTEL V2...
      </div>
    </div>
  );
}
