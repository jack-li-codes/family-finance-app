"use client";

import { categoryOptions } from "@/lib/category-options";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

export default function CategoriesPage() {
  const { lang } = useLang();

  const cellStyle = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    textAlign: "left" as const,
  };

  const thStyle = {
    ...cellStyle,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📋 {t("分类管理", lang)}</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        {t("当前版本仅展示所有分类，暂不支持增删改", lang)}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
        <thead>
          <tr>
            <th style={thStyle}>{t("一级分类", lang)}</th>
            <th style={thStyle}>{t("二级分类", lang)}</th>
            <th style={thStyle}>{t("数量", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categoryOptions).map(([category, subcategories]) => (
            <tr key={category}>
              <td style={cellStyle}>{t(category, lang)}</td>
              <td style={cellStyle}>
                {subcategories.map((sub) => t(sub, lang)).join(", ")}
              </td>
              <td style={{ ...cellStyle, textAlign: "center" }}>
                {subcategories.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
