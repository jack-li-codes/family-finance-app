// app/page.tsx
"use client";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";


export default function HomePage() {
  const { lang } = useLang();
  return (
    <div>
      <h1>🏠 {t("欢迎使用家庭财务App", lang)}</h1>
      <p style={{ marginTop: 12 }}>
         {lang === "zh"
         ? "使用顶部导航管理账户、收支、工程记录与财务汇总。"
         : "Use the top navigation to manage accounts, transactions, worklog, and summary."}
        </p>
    </div>
  );
}
