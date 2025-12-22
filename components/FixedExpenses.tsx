"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";
import {
  demoFixedExpenses,
  realFixedExpenses,
  type FixedExpense,
} from "./fixedExpensesConfig";

// ===== Name 显示层中→英映射（只影响界面，不改数据库） =====
const FIXED_EXPENSE_NAME_EN_MAP: Record<string, string> = {
  "房租": "Rent",
  "水电燃气": "Utilities",
  "网络/手机": "Internet & Mobile",
  "车险": "Car Insurance",
  "健身房": "Gym Membership",
};

const getDisplayName = (name: string, lang: string) => {
  // 中文界面就直接展示原始中文
  if (lang === "zh") return name;
  // 英文界面优先用映射，没有就原样显示
  return FIXED_EXPENSE_NAME_EN_MAP[name] || name;
};
// =========================================================

export default function FixedExpenses() {
  const { lang } = useLang();
  const router = useRouter();
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      // Get current user email
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        console.error("No user logged in");
        setLoading(false);
        return;
      }

      // Check if user is a demo user
      const isDemoUser =
        user.email === "demo1@example.com" ||
        user.email === "demo2@example.com";

      if (isDemoUser) {
        // Use demo data for demo users
        setExpenses(demoFixedExpenses);
        setLoading(false);
        return;
      }

      // For real users, fetch from database
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching fixed expenses:", error);
        // If database fetch fails for real users, use realFixedExpenses as fallback
        setExpenses(realFixedExpenses);
      } else {
        // If database is empty, use realFixedExpenses as default
        setExpenses(data && data.length > 0 ? data : realFixedExpenses);
      }
    } catch (err) {
      console.error("Error:", err);
      // Fallback to real expenses on error
      setExpenses(realFixedExpenses);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const getTotalsByCurrency = () => {
    const totals: Record<string, number> = {};
    expenses.forEach((exp) => {
      if (!totals[exp.currency]) totals[exp.currency] = 0;
      totals[exp.currency] += exp.amount;
    });
    return totals;
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#fffbe6",
          padding: "16px 24px",
          border: "1px solid #f0e6c8",
          borderRadius: 6,
          fontSize: "14px",
          flex: 1,
        }}
      >
        <strong style={{ display: "block", marginBottom: "8px" }}>
          📅 {t("当前月份固定花销", lang)}
        </strong>
        <p style={{ color: "#888", fontSize: "13px" }}>
          {lang === "zh" ? "加载中..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#fffbe6",
          padding: "16px 24px",
          border: "1px solid #f0e6c8",
          borderRadius: 6,
          fontSize: "14px",
          flex: 1,
        }}
      >
        <strong style={{ display: "block", marginBottom: "8px" }}>
          📅 {t("当前月份固定花销", lang)}
        </strong>
        <p
          style={{
            color: "#666",
            fontSize: "13px",
            margin: "8px 0",
          }}
        >
          {lang === "zh"
            ? "暂无固定花销项目。"
            : "No fixed expenses configured."}
        </p>
        <button
          onClick={() => router.push("/fixed-expenses")}
          style={{
            marginTop: "8px",
            padding: "6px 12px",
            backgroundColor: "#ffc107",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {lang === "zh" ? "前往配置" : "Configure"}
        </button>
      </div>
    );
  }

  const totals = getTotalsByCurrency();

  return (
    <div
      style={{
        backgroundColor: "#fffbe6",
        padding: "16px 24px",
        border: "1px solid #f0e6c8",
        borderRadius: 6,
        fontSize: "14px",
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <strong style={{ fontSize: "15px" }}>
          📅 {t("当前月份固定花销", lang)}
        </strong>
        <button
          onClick={() => router.push("/fixed-expenses")}
          style={{
            padding: "4px 10px",
            backgroundColor: "#ffc107",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "11px",
          }}
        >
          {lang === "zh" ? "管理" : "Manage"}
        </button>
      </div>

      <div style={{ marginBottom: "12px" }}>
        {expenses.map((exp) => (
          <div
            key={exp.id}
            style={{
              marginBottom: "6px",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            {exp.icon && (
              <span style={{ marginRight: "6px" }}>{exp.icon}</span>
            )}
            {/* ⭐ 这里用映射后的名字 */}
            <span style={{ fontWeight: 500 }}>
              {getDisplayName(exp.name, lang)}
            </span>
            :{" "}
            <span style={{ color: "#d32f2f" }}>
              {exp.amount.toFixed(2)}
            </span>
            {exp.note && (
              <span style={{ color: "#666", marginLeft: "4px" }}>
                {exp.note}
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid #e0d6b8",
          paddingTop: "10px",
          fontWeight: "bold",
          fontSize: "13px",
        }}
      >
        {Object.entries(totals).map(([currency, total]) => (
          <div key={currency}>
            {lang === "zh" ? "合计" : "Total"}:{" "}
            {formatAmount(total, currency)}
          </div>
        ))}
      </div>
    </div>
  );
}
