// components/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true); // Added: wait for session to load
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthenticated(true);
      }
      setChecking(false); // End loading whether session exists or not
    });
  }, [router]);

  if (checking) return null; // ⏳ Checking login status, don't render anything yet
  if (!authenticated) return null; // ❌ Not logged in, don't show children

  return <>{children}</>;
}
