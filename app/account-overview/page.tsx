"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import * as XLSX from "xlsx";

// ====== 类型 ======
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
  type: string; // "收入" | "支出" | "转账"
  category?: string;
  subcategory?: string;
  amount: number; // 你这边：收入为正，支出为负
  note?: string;
};

type MonthBucket = {
  income: Transaction[];
  expense: Transaction[];
  transfer: Transaction[];
  incomeTotal: number;   // 金额原始正负
  expenseTotal: number;  // 金额原始正负（支出通常为负）
  prevBalance: number;   // 上月末余额（含初始）
  net: number;           // 净额 = incomeTotal + expenseTotal
};

type ByAccount = Record<
  string,
  {
    account: Account;
    months: Record<string, MonthBucket>; // YYYY-MM
    totalIncome: number;  // 累加各月 incomeTotal
    totalExpense: number; // 累加各月 expenseTotal（为负）
    totalNet: number;     // totalIncome + totalExpense
  }
>;

// ====== 工具函数 ======
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

// 简单类型判断（只看 type 字段）
const isIncomeType = (t: Transaction) => t.type === "收入";
const isExpenseType = (t: Transaction) => t.type === "支出";
const isTransfer = (t: Transaction) => t.type === "转账";

// ====== 页面 ======
export default function AccountOverviewPage() {
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

      // 读取账户（包含 initial_balance / initial_date）
      const { data: accData, error: accErr } = await supabase
        .from("accounts")
        .select("id, user_id, name, initial_balance, initial_date")
        .eq("user_id", uid)
        .order("name", { ascending: true });
      if (accErr) console.error(accErr);

      // 读取交易
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

  // —— 分组统计（账户 → 月份）
  const grouped: ByAccount = useMemo(() => {
    if (!transactions.length) return {} as ByAccount;

    const accMap: Record<string, Account> = {};
    accounts.forEach((a) => (accMap[a.id] = a));

    // 按账户分组
    const byAcc: Record<string, Transaction[]> = {};
    for (const t of transactions) {
      const key = t.account_id || "未分配账户";
      (byAcc[key] ||= []).push(t);
    }

    const res: ByAccount = {};

    for (const accId of Object.keys(byAcc)) {
      const account = accMap[accId] || ({ id: accId, name: accId } as Account);
      const list = [...byAcc[accId]].sort((a, b) => a.date.localeCompare(b.date));

      const months: Record<string, MonthBucket> = {};
      const monthSet = new Set<string>();
      list.forEach((t) => t.date && monthSet.add(ym(t.date)));
      const monthKeys = [...monthSet].filter(Boolean).sort(); // 递增

      // —— 截至某月末的余额（含初始；转账不计入；收入/支出按“原始正负”相加）
      const calcBalanceUntilMonthEnd = (targetYM: string) => {
        const initBal = Number(account.initial_balance || 0);
        const initDate = account.initial_date || null;

        let bal = initBal;
        for (const t of list) {
          if (initDate && t.date < initDate) continue; // 初始日期之前不计
          const tYM = ym(t.date);
          if (!tYM || tYM > targetYM) break;
          if (isTransfer(t)) continue;
          bal += Number(t.amount || 0); // 关键：直接按原始正负累加
        }
        return bal;
      };

      for (const m of monthKeys) {
        const income: Transaction[] = [];
        const expense: Transaction[] = [];
        const transfer: Transaction[] = [];

        for (const t of list) {
          if (ym(t.date) !== m) continue;
          if (isTransfer(t)) transfer.push(t);
          else if (isIncomeType(t)) income.push(t);
          else if (isExpenseType(t)) expense.push(t);
        }

        const incomeTotal = income.reduce((s, t) => s + Number(t.amount || 0), 0);
        const expenseTotal = expense.reduce((s, t) => s + Number(t.amount || 0), 0); // 支出一般是负
        const prevBal = calcBalanceUntilMonthEnd(prevMonth(m));
        const net = incomeTotal + expenseTotal; // 关键：支出本身是负

        months[m] = {
          income,
          expense,
          transfer,
          incomeTotal,
          expenseTotal,
          prevBalance: prevBal,
          net,
        };
      }

      // 账户层合计
      let totalIncome = 0;
      let totalExpense = 0;
      Object.values(months).forEach((mm) => {
        totalIncome += mm.incomeTotal;
        totalExpense += mm.expenseTotal;
      });

      res[accId] = {
        account,
        months,
        totalIncome,
        totalExpense,
        totalNet: totalIncome + totalExpense, // 关键：支出为负
      };
    }

    return res;
  }, [transactions, accounts]);

  // —— 导出 Excel（同样遵循“支出为负、净额=加总”）
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      for (const accId of Object.keys(grouped)) {
        const { account, months } = grouped[accId];
        const rows: (string | number)[][] = [];

        rows.push([`账户：${account.name}`]);
        rows.push([`初始余额`, Number(account.initial_balance || 0)]);
        rows.push([`初始日期`, account.initial_date || ""]);
        rows.push([]);

        for (const m of Object.keys(months).sort()) {
          const sec = months[m];

          rows.push([`${m} 上月余额`, sec.prevBalance]);
          rows.push([`${m} 收入汇总（正）`, sec.incomeTotal]);
          rows.push(["日期", "分类", "二级分类", "备注", "金额"]);
          sec.income.forEach((t) =>
            rows.push([t.date, t.category || "", t.subcategory || "", t.note || "", Number(t.amount || 0)])
          );
          rows.push([]);

          rows.push([`${m} 支出汇总（负）`, sec.expenseTotal]);
          rows.push(["日期", "分类", "二级分类", "备注", "金额"]);
          sec.expense.forEach((t) =>
            rows.push([t.date, t.category || "", t.subcategory || "", t.note || "", Number(t.amount || 0)])
          );
          rows.push([]);

          if (sec.transfer.length) {
            rows.push([`${m} 转账（仅展示，不计入汇总）`]);
            rows.push(["日期", "分类", "二级分类", "备注", "金额"]);
            sec.transfer.forEach((t) =>
              rows.push([t.date, t.category || "", t.subcategory || "", t.note || "", Number(t.amount || 0)])
            );
            rows.push([]);
          }

          rows.push([`${m} 当月净额 = 收入 + 支出`, sec.net]);
          rows.push([`${m} 下月余额 = 上月余额 + 净额`, sec.prevBalance + sec.net]);
          rows.push([]);
        }

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(account.name || accId));
      }

      const fileName = `账户总览_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <AuthGuard>加载中…</AuthGuard>;

  const accIds = Object.keys(grouped);

  return (
    <AuthGuard>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>账户总览</h2>
          <button onClick={handleExportExcel} disabled={exporting || accIds.length === 0}>
            {exporting ? "导出中…" : "导出 Excel"}
          </button>
        </div>

        {accIds.length === 0 ? (
          <p>暂无数据。</p>
        ) : (
          accIds.map((accId) => {
            const section = grouped[accId];
            const monthKeys = Object.keys(section.months).sort();
            return (
              <div key={accId} style={{ marginTop: 20, border: "1px solid #ddd", borderRadius: 8 }}>
                <div style={{ padding: "12px 16px", background: "#f7f7f7" }}>
                  <strong>{section.account.name}</strong>
                  <span style={{ marginLeft: 20 }}>
                    收入合计：{fmt(section.totalIncome)} | 支出合计：{fmt(section.totalExpense)} | 净额：{fmt(section.totalNet)}
                  </span>
                </div>

                <div style={{ padding: 12 }}>
                  {monthKeys.map((m) => {
                    const msec = section.months[m];
                    return (
                      <details key={m} style={{ marginBottom: 10 }}>
                        <summary>
                            {m} ｜ 上月余额：{fmt(msec.prevBalance)}
                             ｜ 收入：{fmt(msec.incomeTotal)}
                             ｜ 支出：{fmt(msec.expenseTotal)}
                             ｜ 净额（收+支）：{fmt(msec.net)}
                             ｜ 下月余额：{fmt(msec.prevBalance + msec.net)}
                        </summary>
                        <div>
                          <h4>收入汇总（为正） {fmt(msec.incomeTotal)}</h4>
                          {msec.income.length ? (
                            <ul>
                              {msec.income.map((t) => (
                                <li key={t.id}>
                                  {t.date} | {t.category} / {t.subcategory} | {t.note} | {fmt(t.amount)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>无收入明细</p>
                          )}

                          <h4 style={{ marginTop: 12 }}>支出汇总（为负） {fmt(msec.expenseTotal)}</h4>
                          {msec.expense.length ? (
                            <ul>
                              {msec.expense.map((t) => (
                                <li key={t.id}>
                                  {t.date} | {t.category} / {t.subcategory} | {t.note} | {fmt(t.amount)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>无支出明细</p>
                          )}

                          {msec.transfer.length > 0 && (
                            <>
                              <h4 style={{ marginTop: 12 }}>转账（仅展示，不计入汇总）</h4>
                              <ul>
                                {msec.transfer.map((t) => (
                                  <li key={t.id}>
                                    {t.date} | {t.category} / {t.subcategory} | {t.note} | {fmt(t.amount)}
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
