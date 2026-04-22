// app/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./topnav.css";

const ADMIN_EMAIL = "lucy.jinhui@gmail.com";

const BASE_NAV_ITEMS = [
  { href: "/accounts", label: "账户管理" },
  { href: "/fixed-expenses", label: "固定花销管理" },
  { href: "/transactions", label: "收入/支出" },
  { href: "/categories", label: "分类管理" },
  { href: "/summary", label: "收支汇总" },
  { href: "/account-overview", label: "账户总揽" },
  { href: "/worklog", label: "工程记录" },
  { href: "/balance", label: "账户余额" },
  { href: "/projects", label: "项目管理" },
  { href: "/users", label: "用户管理", adminOnly: true },
];

export function TopNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });
  }, []);

  const navItems = BASE_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const active =
    navItems.find((item) =>
      pathname === "/" ? item.href === "/accounts" : pathname.startsWith(item.href)
    )?.href ?? "";

  return (
    <header className="topnav-wrapper">
      <nav className="topnav-scroll">
        {navItems.map((item) => {
          const isActive = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topnav-item ${isActive ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
