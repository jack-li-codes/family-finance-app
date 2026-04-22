import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ADMIN_EMAIL = 'lucy.jinhui@gmail.com';

// Helper function to check if user is admin
async function isAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // 在这个 API 场景里只是读取当前登录用户，不需要写 cookie
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

// POST /api/users/reset-password - Reset user password
export async function POST(req: NextRequest) {
  try {
    // Check admin permission
    if (!await isAdmin(req)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: '用户ID和新密码不能为空' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
