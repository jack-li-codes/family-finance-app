"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import * as XLSX from "xlsx";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

// ====== Types ======
type Account = {
  id: string;
  user_id: string;
  name: string;
  initial_balance?: number | null;
  initial_date?: string | null; // "YYYY-MM-DD"
};

type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  date: string; // "YYYY-MM-DD"
  type: string; // "收入" | "支出" | "转账"  or  "income" | "expense" | "transfer"
  category?: string;
  subcategory?: string;
  amount: number; // Income is positive, expenses are negative
  note?: string;
};

type MonthBucket = {
  income: Transaction[];
  expense: Transaction[];
  transfer: Transaction[];
  incomeTotal: number;   // Original positive/negative amounts
  expenseTotal: number;  // Original positive/negative amounts (expenses are typically negative)
  prevBalance: number;   // Previous month-end balance (including initial)
  net: number;           // Net amount = incomeTotal + expenseTotal
};

type ByAccount = Record<
  string,
  {
    account: Account;
    months: Record<string, MonthBucket>; // YYYY-MM
    totalIncome: number;  // Sum of monthly incomeTotal
    totalExpense: number; // Sum of monthly expenseTotal (negative)
    totalNet: number;     // totalIncome + totalExpense
  }
>;

// ====== Utility Functions ======
const fmt = (n: number) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ym = (d: string) => (d ? d.slice(0, 7) : "");

const prevMonth = (yyyyMM: string) => {
  const [y, m] = yyyyMM.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
};

const sanitizeSheetName = (name: string) =>
  (name || "Sheet").replace(/[\\\/\?\*\[\]\:]/g, "_").slice(0, 31);

// Simple type checking (compatible with Chinese and English)
const isIncomeType  = (tx: Transaction) => tx.type === "收入" || tx.type === "income";
const isExpenseType = (tx: Transaction) => tx.type === "支出" || tx.type === "expense";
const isTransfer    = (tx: Transaction) => tx.type === "转账" || tx.type === "transfer";

// ====== Page Component ======
export default function AccountOverviewPage() {
  const { lang } = useLang();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      // Load accounts (including initial_balance / initial_date)
      const { data: accData, error: accErr } = await supabase
        .from("accounts")
        .select("id, user_id, name, initial_balance, initial_date")
        .eq("user_id", uid)
        .order("name", { ascending: true });
      if (accErr) console.error(accErr);

      // Load transactions
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true });
      if (txErr) console.error(txErr);

      setAccounts((accData || []) as Account[]);
      setTransactions((txData || []) as Transaction[]);
      setLoading(false);
    })();
  }, []);

  // —— Group statistics (account → month)
  const grouped: ByAccount = useMemo(() => {
    if (!transactions.length) return {} as ByAccount;

    const accMap: Record<string, Account> = {};
    accounts.forEach((a) => (accMap[a.id] = a));

    // Group by account
    const byAcc: Record<string, Transaction[]> = {};
    for (const tx of transactions) { // ← Use tx to avoid conflict with translation function t
      const key = tx.account_id || t("未分配账户", lang);
      (byAcc[key] ||= []).push(tx);
    }

    const res: ByAccount = {};

    for (const accId of Object.keys(byAcc)) {
      const account = accMap[accId] || ({ id: accId, name: accId } as Account);
      const list = [...byAcc[accId]].sort((a, b) => a.date.localeCompare(b.date));

      const months: Record<string, MonthBucket> = {};
      const monthSet = new Set<string>();
      list.forEach((tx) => tx.date && monthSet.add(ym(tx.date)));
      const monthKeys = [...monthSet].filter(Boolean).sort(); // ascending

      // —— Balance until end of month (including initial; transfers not included; income/expense added by original positive/negative)
      const calcBalanceUntilMonthEnd = (targetYM: string) => {
        const initBal = Number(account.initial_balance || 0);
        const initDate = account.initial_date || null;

        let bal = initBal;
        for (const tx of list) {
          if (initDate && tx.date < initDate) continue; // Don't count before initial date
          const tYM = ym(tx.date);
          if (!tYM || tYM > targetYM) break;
          if (isTransfer(tx)) continue;
          bal += Number(tx.amount || 0); // Directly accumulate by original positive/negative
        }
        return bal;
      };

      for (const m of monthKeys) {
        const income: Transaction[] = [];
        const expense: Transaction[] = [];
        const transfer: Transaction[] = [];

        for (const tx of list) {
          if (ym(tx.date) !== m) continue;
          if (isTransfer(tx)) transfer.push(tx);
          else if (isIncomeType(tx)) income.push(tx);
          else if (isExpenseType(tx)) expense.push(tx);
        }

        const incomeTotal  = income.reduce((s, tx) => s + Number(tx.amount || 0), 0);
        const expenseTotal = expense.reduce((s, tx) => s + Number(tx.amount || 0), 0); // Expenses are generally negative
        const prevBal      = calcBalanceUntilMonthEnd(prevMonth(m));
        const net          = incomeTotal + expenseTotal; // Expenses themselves are negative

        months[m] = { income, expense, transfer, incomeTotal, expenseTotal, prevBalance: prevBal, net };
      }

      // Account-level totals
      let totalIncome = 0;
      let totalExpense = 0;
      Object.values(months).forEach((mm) => {
        totalIncome  += mm.incomeTotal;
        totalExpense += mm.expenseTotal;
      });

      res[accId] = {
        account,
        months,
        totalIncome,
        totalExpense,
        totalNet: totalIncome + totalExpense,
      };
    }

    return res;
  }, [transactions, accounts, lang]); // When language switches, the "Unassigned Account" group title also updates

  // —— Export Excel (also follows "expenses are negative, net amount = sum")
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      for (const accId of Object.keys(grouped)) {
        const { account, months } = grouped[accId];
        const rows: (string | number)[][] = [];

        rows.push([`${t("账户", lang)}：${account.name}`]);
        rows.push([t("初始余额", lang), Number(account.initial_balance || 0)]);
        rows.push([t("初始日期", lang), account.initial_date || ""]);
        rows.push([]);

        for (const m of Object.keys(months).sort()) {
          const sec = months[m];

          rows.push([`${m} ${t("上月余额", lang)}`, sec.prevBalance]);
          rows.push([`${m} ${t("收入汇总（正）", lang)}`, sec.incomeTotal]);
          rows.push([t("日期", lang), t("分类", lang), t("二级分类", lang), t("备注", lang), t("金额", lang)]);
          sec.income.forEach((tx) =>
            rows.push([tx.date, tx.category || "", tx.subcategory || "", tx.note || "", Number(tx.amount || 0)])
          );
          rows.push([]);

          rows.push([`${m} ${t("支出汇总（负）", lang)}`, sec.expenseTotal]);
          rows.push([t("日期", lang), t("分类", lang), t("二级分类", lang), t("备注", lang), t("金额", lang)]);
          sec.expense.forEach((tx) =>
            rows.push([tx.date, tx.category || "", tx.subcategory || "", tx.note || "", Number(tx.amount || 0)])
          );
          rows.push([]);

          if (sec.transfer.length) {
            rows.push([`${m} ${t("转账（仅展示，不计入汇总）", lang)}`]);
            rows.push([t("日期", lang), t("分类", lang), t("二级分类", lang), t("备注", lang), t("金额", lang)]);
            sec.transfer.forEach((tx) =>
              rows.push([tx.date, tx.category || "", tx.subcategory || "", tx.note || "", Number(tx.amount || 0)])
            );
            rows.push([]);
          }

          rows.push([`${m} ${t("当月净额 = 收入 + 支出", lang)}`, sec.net]);
          rows.push([`${m} ${t("下月余额 = 上月余额 + 净额", lang)}`, sec.prevBalance + sec.net]);
          rows.push([]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(account.name || accId));
      }

      const fileName = `${t("账户总览", lang)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <AuthGuard>{t("加载中…", lang)}</AuthGuard>;

  const accIds = Object.keys(grouped);

  return (
    <AuthGuard>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{t("账户总览", lang)}</h2>
          <button onClick={handleExportExcel} disabled={exporting || accIds.length === 0}>
            {exporting ? t("导出中…", lang) : t("导出 Excel", lang)}
          </button>
        </div>

        {accIds.length === 0 ? (
          <p>{t("暂无数据。", lang)}</p>
        ) : (
          accIds.map((accId) => {
            const section = grouped[accId];
            const monthKeys = Object.keys(section.months).sort();
            return (
              <div key={accId} style={{ marginTop: 20, border: "1px solid #ddd", borderRadius: 8 }}>
                <div style={{ padding: "12px 16px", background: "#f7f7f7" }}>
                  <strong>{section.account.name}</strong>
                  <span style={{ marginLeft: 20 }}>
                    {t("收入合计", lang)}：{fmt(section.totalIncome)} | {t("支出合计", lang)}：
                    {fmt(section.totalExpense)} | {t("净额", lang)}：{fmt(section.totalNet)}
                  </span>
                </div>

                <div style={{ padding: 12 }}>
                  {monthKeys.map((m) => {
                    const msec = section.months[m];
                    return (
                      <details key={m} style={{ marginBottom: 10 }}>
                        <summary>
                          {m} ｜ {t("上月余额", lang)}：{fmt(msec.prevBalance)}
                          ｜ {t("收入", lang)}：{fmt(msec.incomeTotal)}
                          ｜ {t("支出", lang)}：{fmt(msec.expenseTotal)}
                          ｜ {t("净额（收+支）", lang)}：{fmt(msec.net)}
                          ｜ {t("下月余额", lang)}：{fmt(msec.prevBalance + msec.net)}
                        </summary>
                        <div>
                          <h4>
                            {t("收入汇总（为正）", lang)} {fmt(msec.incomeTotal)}
                          </h4>
                          {msec.income.length ? (
                            <ul>
                              {msec.income.map((tx) => (
                                <li key={tx.id}>
                                  {tx.date} | {tx.category} / {tx.subcategory} | {tx.note} | {fmt(tx.amount)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{t("无收入明细", lang)}</p>
                          )}

                          <h4 style={{ marginTop: 12 }}>
                            {t("支出汇总（为负）", lang)} {fmt(msec.expenseTotal)}
                          </h4>
                          {msec.expense.length ? (
                            <ul>
                              {msec.expense.map((tx) => (
                                <li key={tx.id}>
                                  {tx.date} | {tx.category} / {tx.subcategory} | {tx.note} | {fmt(tx.amount)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{t("无支出明细", lang)}</p>
                          )}

                          {msec.transfer.length > 0 && (
                            <>
                              <h4 style={{ marginTop: 12 }}>{t("转账（仅展示，不计入汇总）", lang)}</h4>
                              <ul>
                                {msec.transfer.map((tx) => (
                                  <li key={tx.id}>
                                    {tx.date} | {tx.category} / {tx.subcategory} | {tx.note} | {fmt(tx.amount)}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AuthGuard>
  );
}
