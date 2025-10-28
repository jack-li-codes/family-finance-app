

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

export default function LoginPage() {
  const { lang } = useLang();
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(t("登录失败，请检查邮箱和密码", lang))
    } else {
      router.push('/accounts') // 登录成功跳转
    }
  }

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      setMessage(t("发送失败，请确认邮箱正确", lang))
    } else {
      setMessage(t("已发送重设密码邮件，请检查邮箱", lang))
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-xl font-bold mb-4">{t("登录账户", lang)}</h2>
      <input
        type="email"
        placeholder={t("邮箱", lang)}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2 w-72"
      />
      <input
        type="password"
        placeholder={t("密码", lang)}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mb-2 w-72"
      />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-2 w-72"
      >
        登录
      </button>
      <button
        onClick={handleResetPassword}
        className="text-sm text-blue-500 underline mb-2"
      >
        {t("忘记密码？点我发送重置链接", lang)}
      </button>
      {message && <p className="text-red-500">{message}</p>}
    </div>
  )
}
