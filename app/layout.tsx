// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LangProvider, useLang } from "./i18n-context";
import { t } from "./i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Sync <html lang> to ensure browser controls (e.g., date picker) display in correct language */
function LangSetter() {
  const { lang } = useLang();
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
  return null;
}

/** Top navigation */
function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Extract email prefix (before @)
  const displayName = userEmail ? userEmail.split('@')[0] : null;

  const navItems = [
    { icon: "🏠", key: "账户管理", href: "/accounts" },
    { icon: "📂", key: "分类管理", href: "/categories" },
    { icon: "👤", key: "用户管理", href: "/users", adminOnly: true },
    { icon: "💰", key: "固定花销管理", href: "/fixed-expenses" },
    { icon: "📄", key: "收入/支出", href: "/transactions" },
    { icon: "📊", key: "收支汇总", href: "/summary" },
    { icon: "📈", key: "账户总揽", href: "/account-overview" },
    { icon: "🛠", key: "工程记录", href: "/worklog" },
    { icon: "📊", key: "账户余额", href: "/balance" },
    { icon: "📚", key: "项目管理", href: "/projects" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",         // ✅ 允许整条导航换行（适配手机）
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: "#333",
        gap: 8,
        boxSizing: "border-box",
      }}
    >
      {/* 左侧：导航 tab 区域 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",       // ✅ tab 自己也可以换行
          gap: 8,
          flex: "1 1 auto",
        }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                textDecoration: active ? "underline" : "none",
                color: active ? "#fff" : "#ddd",
                backgroundColor: active ? "#444" : "transparent",
              }}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{t(item.key, lang)}</span>
            </Link>
          );
        })}
      </div>

      {/* 右侧：用户信息、退出登录、语言切换按钮 */}
      <div
        style={{
          marginLeft: "auto",
          marginTop: 4,           // 手机端换到第二行时，看起来更自然
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {displayName && (
          <span
            style={{
              color: "#ddd",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
        )}
        {userEmail && (
          <button
            onClick={handleLogout}
            style={{
              color: "#fff",
              background: "#dc3545",
              borderRadius: 4,
              padding: "4px 10px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
            title={lang === "zh" ? "退出登录" : "Logout"}
          >
            {lang === "zh" ? "退出" : "Logout"}
          </button>
        )}
        <button
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          style={{
            color: "#333",
            background: "#fff",
            borderRadius: 8,
            padding: "6px 10px",
            border: "none",
            cursor: "pointer",
          }}
          title={lang === "zh" ? "Switch to English" : "切换为中文"}
        >
          {lang === "zh" ? "EN" : "中"}
        </button>
      </div>
    </nav>
  );
}

/** Main page structure */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "sans-serif",
          backgroundColor: "#f8f9fa",
        }}
      >
        <LangProvider>
          <LangSetter />
          <Nav />
          <main style={{ padding: 24 }}>{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
