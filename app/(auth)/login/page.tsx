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
      router.push('/accounts') // Redirect on successful login
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      
      {/* 项目名称 + 副标题（与登录卡片作为一个整体居中） */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-wide">
          Family Finance
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Household account &amp; project tracker
        </p>
      </div>
  
      {/* 登录卡片 */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 text-center">
          {t("登录账户", lang)}
        </h2>
  
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("邮箱", lang)}
            </label>
            <input
              type="email"
              placeholder={t("邮箱", lang)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
  
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("密码", lang)}
            </label>
            <input
              type="password"
              placeholder={t("密码", lang)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
  
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            {t("登录", lang)}
          </button>
  
          <button
            onClick={handleResetPassword}
            className="w-full text-xs text-blue-600 underline mt-1"
          >
            {t("忘记密码？点我发送重置链接", lang)}
          </button>
  
          {message && (
            <p className="text-xs text-red-500 mt-2 text-center">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )  
}
