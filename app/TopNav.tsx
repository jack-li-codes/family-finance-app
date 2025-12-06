// app/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./topnav.css";

const NAV_ITEMS = [
  { href: "/accounts", label: "账户管理" },
  { href: "/fixed-expenses", label: "固定花销管理" },
  { href: "/transactions", label: "收入/支出" },
  { href: "/summary", label: "收支汇总" },
  { href: "/account-overview", label: "账户总揽" },
  { href: "/worklog", label: "工程记录" },
  { href: "/balance", label: "账户余额" },
  { href: "/projects", label: "项目管理" },
];

export function TopNav() {
  const pathname = usePathname();

  const active =
    NAV_ITEMS.find((item) =>
      pathname === "/" ? item.href === "/accounts" : pathname.startsWith(item.href)
    )?.href ?? "";

  return (
    <header className="topnav-wrapper">
      <nav className="topnav-scroll">
        {NAV_ITEMS.map((item) => {
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
