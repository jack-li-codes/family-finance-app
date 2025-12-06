// app/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  // 当前在哪个 tab，用于高亮 & select 选中
  const active =
    NAV_ITEMS.find((item) =>
      pathname === "/" ? item.href === "/accounts" : pathname.startsWith(item.href)
    )?.href ?? "";

  return (
    <header className="top-nav-wrapper">
      {/* 桌面端导航 */}
      <nav className="top-nav-desktop">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              "top-nav-item" + (active === item.href ? " top-nav-item-active" : "")
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 手机端导航：下拉选择 */}
      <div className="top-nav-mobile">
        <select
          value={active}
          onChange={(e) => {
            if (e.target.value) {
              router.push(e.target.value);
            }
          }}
        >
          <option value="">请选择页面</option>
          {NAV_ITEMS.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
