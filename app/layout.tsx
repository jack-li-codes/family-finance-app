// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangProvider, useLang } from "./i18n-context";
import { t } from "./i18n";
import { useEffect } from "react";

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
  const { lang, setLang } = useLang();

  const navItems = [
    { icon: "💳", key: "账户管理", href: "/accounts" },
    { icon: "💰", key: "固定花销管理", href: "/fixed-expenses" },
    { icon: "📁", key: "收入/支出", href: "/transactions" },
    { icon: "📊", key: "收支汇总", href: "/summary" },
    { icon: "📊", key: "账户总揽", href: "/account-overview" },
    { icon: "🛠", key: "工程记录", href: "/worklog" },
    { icon: "📊", key: "账户余额", href: "/balance" },
    { icon: "📚", key: "项目管理", href: "/projects" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        gap: 20,
        padding: "12px 24px",
        backgroundColor: "#333",
        alignItems: "center",
      }}
    >
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              color: active ? "#fff" : "#ddd",
              textDecoration: active ? "underline" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden>{item.icon}</span>
            <span>{t(item.key, lang)}</span>
          </Link>
        );
      })}

      <div style={{ marginLeft: "auto" }}>
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
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f8f9fa" }}>
        <LangProvider>
          <LangSetter />
          <Nav />
          <main style={{ padding: 24 }}>{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
