import React from "react";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

export default function FixedExpenses() {
  const { lang } = useLang();
  <p style={{ color: "green", fontWeight: "bold" }}>🚀 v2 - 新版本已上线～~~</p>
  return (
    
    <div style={{ backgroundColor: "#fffbe6", padding: "16px 24px", border: "1px solid #f0e6c8", borderRadius: 6, fontSize: "14px", flex: 1 }}>
      <strong style={{ display: "block", marginBottom: "8px" }}>📅 {t("当前月固定花销", lang)}</strong>
      <div style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        rowGap: "6px",
        columnGap: "20px",
        whiteSpace: "nowrap"
      }}>
        <div>🏠 {t("房贷", lang)}:</div><div>4482.28（每月28号）</div>
        <div>🚗 {t("汽车保险", lang)}</div><div>497.13（每月23号）</div>
        <div>🏡 {t("房屋保险", lang)}</div><div>208.02（每月23号）</div>
        <div>🚘 {t("车 lease", lang)}:</div><div>817.22（每月10号）</div>
        <div>📅 {t("地税", lang)}:</div><div>1560（4月1次，6月25号）</div>
        <div>💡 {t("水电", lang)}:</div><div>约130（每月20号）</div>
        <div>🔥 {t("煤气", lang)}:</div><div>约130（每月20号）</div>
        <div>🌐 {t("宽带", lang)}:</div><div>74（每月5号，LJS信用卡）</div>
        <div>📱 {t("电话费", lang)}:</div><div>169.47（每月25号，JH信用卡）</div>
      </div>
    </div>
  );
}
