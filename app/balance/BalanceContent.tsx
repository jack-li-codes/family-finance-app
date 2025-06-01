"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Transaction } from "../types";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [checking, setChecking] = useState(true); // ✅ 增加检查状态

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false); // 即使无用户也结束 loading
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
      setChecking(false); // ✅ 数据加载完成
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
      "账户名称": acc.name,
      "币种": acc.currency,
      "初始余额": typeof acc.initial_balance === "number" ? acc.initial_balance.toFixed(2) : "",
      "当前余额": getCurrentBalance(acc).toFixed(2),
      "备注": acc.note,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "账户余额");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "账户余额.xlsx");
  };

  if (checking) return null; // ✅ 避免未登录或加载中时渲染

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "auto", fontFamily: "sans-serif" }}>
      <h1>📊 账户余额快照</h1>

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
        导出为 Excel
      </button>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr>
            {["账户名称", "币种", "初始余额", "当前余额", "备注"].map((header) => (
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
