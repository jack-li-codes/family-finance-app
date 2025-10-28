// app/page.tsx
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";


export default function HomePage() {
  const { lang } = useLang();
  return (
    <div>
      <h1>{t("🏠 欢迎使用家庭财务App", lang)}</h1>
      <p style={{ marginTop: 12 }}>
        {t("请通过上方导航栏访问各个功能模块：账户余额、收支记录、工程记录、收支汇总。", lang)}
      </p>
    </div>
  );
}
