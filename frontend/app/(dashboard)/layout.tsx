'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { apiClient } from '@/lib/api/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Issue #65: session lives in an httpOnly cookie — verify against the
    // server instead of reading localStorage (which no longer holds a token).
    apiClient
      .get('/auth/me')
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        setIsAuthenticated(false);
        router.replace('/login');
      });
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0E1113] flex items-center justify-center">
        <div className="animate-pulse text-xs font-mono text-[#C58B3A] font-bold uppercase tracking-widest">
          Authenticating Operational Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
