

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('登录失败，请检查邮箱和密码')
    } else {
      router.push('/accounts') // 登录成功跳转
    }
  }

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      setMessage('发送失败，请确认邮箱正确')
    } else {
      setMessage('已发送重设密码邮件，请检查邮箱')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-xl font-bold mb-4">登录账户</h2>
      <input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2 w-72"
      />
      <input
        type="password"
        placeholder="密码"
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
        忘记密码？点我发送重置链接
      </button>
      {message && <p className="text-red-500">{message}</p>}
    </div>
  )
}
