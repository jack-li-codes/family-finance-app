// components/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true); // 新增：等待 session 加载完成
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setAuthenticated(true);
      }
      setChecking(false); // 不管有没有 session 都结束加载
    });
  }, [router]);

  if (checking) return null; // ⏳ 登录状态检查中，先不渲染任何内容
  if (!authenticated) return null; // ❌ 未登录，不显示子组件

  return <>{children}</>;
}
