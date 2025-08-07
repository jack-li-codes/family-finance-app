// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "💳 账户管理", href: "/accounts" },
    { label: "📁 收入/支出", href: "/transactions" },
    { label: "📊 收支汇总CAD", href: "/summary" },
    { label: "🛠 工程记录", href: "/worklog" },
    { label: "📊 账户余额", href: "/balance" },
    { label: "📚 项目管理", href: "/projects" }, // ✅ 新增菜单项
  ];

  return (
    <html lang="zh">
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f8f9fa" }}>
        <nav style={{ display: "flex", gap: "20px", padding: "12px 24px", backgroundColor: "#333" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: pathname === item.href ? "#00d8ff" : "#fff",
                textDecoration: "none",
                fontWeight: pathname === item.href ? "bold" : "normal",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main style={{ padding: "24px" }}>{children}</main>
      </body>
    </html>
  );
}
