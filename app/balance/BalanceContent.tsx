"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Transaction } from "../types";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

type Account = {
  id: string;
  name: string;
  category: string;
  owner: string;
  initial_balance: number;
  initial_date: string | null;
  currency: string;
  card_number: string;
  note: string;
  balance: number;
  user_id?: string;
};

export default function BalanceContent() {
  const { lang } = useLang();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }

      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);

      if (txData) setTransactions(txData);
      if (accData) setAccounts(accData);
      setChecking(false);
    };

    fetchData();
  }, []);

  const getCurrentBalance = (account: Account) => {
    const txAfterStart = transactions.filter(
      (tx) =>
        tx.account_id === account.id &&
        (!account.initial_date || tx.date >= account.initial_date)
    );
    const delta = txAfterStart.reduce((sum, tx) => sum + tx.amount, 0);
    return (account.initial_balance || 0) + delta;
  };

  const exportToExcel = () => {
    const exportData = accounts.map((acc) => ({
      [t("账户名称", lang)]: acc.name,
      [t("币种", lang)]: acc.currency,
      [t("初始余额", lang)]: typeof acc.initial_balance === "number" ? acc.initial_balance.toFixed(2) : "",
      [t("当前余额", lang)]: getCurrentBalance(acc).toFixed(2),
      [t("备注", lang)]: acc.note,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    // Worksheet name and filename switch based on language
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      lang === "zh" ? "账户余额" : "Balance"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, (lang === "zh" ? "账户余额" : "Balance") + ".xlsx");
  };

  if (checking) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", marginLeft: 0, marginRight: "auto", fontFamily: "sans-serif" }}>
      <h1>📊 {t("账户余额快照", lang)}</h1>

      <button
        onClick={exportToExcel}
        style={{
          margin: "12px 0",
          backgroundColor: "#007bff",
          color: "white",
          padding: "10px 16px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        📤 {t("导出为 Excel", lang)}
      </button>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr>
            {[t("账户名称", lang), t("币种", lang), t("初始余额", lang), t("当前余额", lang), t("备注", lang)].map((header) => (
              <th
                key={header}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  backgroundColor: "#f1f1f1",
                  textAlign: "left",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc, idx) => (
            <tr key={idx}>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{acc.name}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{acc.currency}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                {typeof acc.initial_balance === "number"
                  ? acc.initial_balance.toFixed(2)
                  : "—"}
              </td>
              <td
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  fontWeight: "bold",
                }}
              >
                {getCurrentBalance(acc).toFixed(2)}
              </td>
              <td
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {acc.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
