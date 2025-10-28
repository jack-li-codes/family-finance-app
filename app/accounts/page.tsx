"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import * as XLSX from "xlsx";
import FixedExpenses from "@/components/FixedExpenses";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

// 账户类别选项（值保留中文以兼容历史数据；显示用 t()）
const ACCOUNT_CATEGORY_OPTIONS = [
  "活期账户",
  "信用账户",
  "现金账户",
  "社保账户",
] as const;

type Account = {
  id: string;
  name: string;
  category: string;
  owner: string;
  balance: number;
  currency: string;
  card_number: string;
  note: string;
  initial_balance: number;
  initial_date: string | null;
  user_id?: string;
};

type Transaction = {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  [key: string]: any;
};

// 本地时区 YYYY-MM-DD（避免跨日）
const toLocalISODate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

export default function AccountsPage() {
  const { lang } = useLang();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalanceMap, setTotalBalanceMap] = useState<Record<string, number>>({});
  const [newAccount, setNewAccount] = useState<Omit<Account, "id">>({
    name: "",
    category: "",
    owner: "",
    balance: 0,
    currency: "CAD",
    card_number: "",
    note: "",
    initial_balance: 0,
    initial_date: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
    });
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: accData } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id);

    if (accData) setAccounts(accData);
    if (txData) setTransactions(txData);
  };

  const getCurrentBalance = (account: Account): number => {
    const txAfterStart = transactions.filter(
      (tx) =>
        tx.account_id === account.id &&
        (!account.initial_date || tx.date >= account.initial_date)
    );
    const delta = txAfterStart.reduce((sum, tx) => sum + tx.amount, 0);
    return (account.initial_balance || 0) + delta;
  };

  useEffect(() => {
    const totals: Record<string, number> = {};
    accounts.forEach((acc) => {
      const current = getCurrentBalance(acc);
      if (!totals[acc.currency]) totals[acc.currency] = 0;
      totals[acc.currency] += current;
    });
    setTotalBalanceMap(totals);
  }, [accounts, transactions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAccount((prev) => ({
      ...prev,
      [name]: ["balance", "initial_balance"].includes(name)
        ? parseFloat(value.replace(/^0+(?=\d)/, "")) || 0
        : value,
    }));
  };

  const handleSave = async () => {
    if (!newAccount.name || !newAccount.owner) {
      alert(t("账户名称和所有人不能为空", lang));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert(t("未登录用户，无法添加账户", lang));
      return;
    }

    const accountData = {
      ...newAccount,
      user_id: user.id,
      initial_date: newAccount.initial_date ? newAccount.initial_date : null,
    };

    const { error } = editingId
      ? await supabase.from("accounts").update(accountData).eq("id", editingId)
      : await supabase.from("accounts").insert(accountData);

    if (error) {
      console.error(t("保存失败：", lang), error.message);
      alert(t("保存失败：", lang) + error.message);
      return;
    }

    setShowForm(false);
    resetForm();
    fetchData();
  };

  const handleEdit = (account: Account) => {
    const { id, ...rest } = account;
    setNewAccount(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("确定要删除这个账户吗？", lang))) {
      await supabase.from("accounts").delete().eq("id", id);
      fetchData();
    }
  };

  const exportToExcel = () => {
    const formatted = accounts.map((acc) => ({
      [t("账户名称", lang)]: acc.name,
      [t("分类", lang)]: t(acc.category, lang),
      [t("所有人", lang)]: acc.owner,
      [t("币种", lang)]: acc.currency,
      [t("初始余额", lang)]: acc.initial_balance,
      [t("当前余额", lang)]: getCurrentBalance(acc).toFixed(2),
      [t("卡号", lang)]: acc.card_number,
      [t("备注", lang)]: acc.note,
      [t("起始日期", lang)]: acc.initial_date ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts");
    XLSX.writeFile(wb, "accounts.xlsx");
  };

  const resetForm = () => {
    setNewAccount({
      name: "",
      category: "",
      owner: "",
      balance: 0,
      currency: "CAD",
      card_number: "",
      note: "",
      initial_balance: 0,
      // 👉 默认今天；如果想默认空，把下一行改成 null
      initial_date: toLocalISODate(new Date()),
    });
    setEditingId(null);
  };

  const thStyle = {
    border: "1px solid #ccc",
    padding: "12px 16px",
    backgroundColor: "#f1f1f1",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };

  const tdStyle = {
    border: "1px solid #ccc",
    padding: "10px 16px",
    verticalAlign: "middle",
    whiteSpace: "nowrap" as const,
  };

  return (
    <AuthGuard>
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>🏠 {t("家庭账户管理", lang)}</h1>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>
            {t("家庭账户总余额", lang)}：
            {Object.entries(totalBalanceMap).map(([currency, amount]) => (
              <div key={currency}>
                {currency}：
                <span style={{ color: amount >= 0 ? "green" : "red" }}>
                  {amount.toFixed(2)} {amount >= 0 ? t("（正）", lang) : t("（负）", lang)}
                </span>
              </div>
            ))}
          </div>

          <FixedExpenses />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => { setShowForm(!showForm); resetForm(); }}
            style={{ backgroundColor: "green", color: "white", padding: "8px 16px", borderRadius: 4 }}
          >
            ➕ {t("添加账户", lang)}
          </button>
          <button onClick={exportToExcel} style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px", borderRadius: 4 }}>
            📤 {t("导出为 Excel", lang)}
          </button>
        </div>

        {showForm && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: "1px solid #ccc" }}>
            <thead>
              <tr>
                {["账户名称", "分类", "所有人", "币种", "卡号", "备注", "初始余额", "起始日期"].map((h) => (
                  <th key={h} style={thStyle}>{t(h, lang)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["name", "category", "owner", "currency", "card_number", "note", "initial_balance", "initial_date"].map((key) => (
                  <td key={key} style={tdStyle}>
                    {key === "category" ? (
                      <select
                        name="category"
                        value={newAccount.category}
                        onChange={handleChange}
                        style={{ padding: 6, width: "100%" }}
                      >
                        <option value="">{t("选择分类", lang)}</option>
                        {ACCOUNT_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {t(opt, lang)}
                          </option>
                        ))}
                      </select>
                    ) : key === "initial_date" ? (
                      // 👉 统一使用原生日期选择器（点击即出日历）
                      <input
                        name="initial_date"
                        type="date"
                        value={newAccount.initial_date ?? ""}
                        onChange={handleChange}
                        style={{ padding: 6, width: "100%", boxSizing: "border-box" }}
                      />
                    ) : (
                      <input
                        name={key}
                        type={["initial_balance"].includes(key) ? "number" : "text"}
                        value={
                          ["initial_balance"].includes(key)
                            ? ((newAccount as any)[key] === 0 ? "" : String((newAccount as any)[key]))
                            : (newAccount as any)[key] ?? ""
                        }
                        onChange={handleChange}
                        style={{ padding: 6, width: "100%", boxSizing: "border-box" }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} style={{ textAlign: "left", padding: 16 }}>
                  <button onClick={handleSave} style={{ backgroundColor: "#0d6efd", color: "white", padding: "8px 16px", borderRadius: 4 }}>
                    {t("保存", lang)}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {[
                "账户名称",
                "分类",
                "所有人",
                "币种",
                "卡号",
                "备注",
                "初始余额",
                "当前余额",
                "起始日期",
                "操作"
              ].map((h) => (
                <th key={h} style={thStyle}>{t(h, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td style={tdStyle}>{acc.name}</td>
                <td style={tdStyle}>{t(acc.category, lang)}</td>
                <td style={tdStyle}>{acc.owner}</td>
                <td style={tdStyle}>{acc.currency}</td>
                <td style={tdStyle}>{acc.card_number}</td>
                <td style={tdStyle}>{acc.note}</td>
                <td style={tdStyle}>{acc.initial_balance}</td>
                <td style={tdStyle}><b>{getCurrentBalance(acc).toFixed(2)}</b></td>
                <td style={tdStyle}>{acc.initial_date ?? ""}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(acc)} style={{ backgroundColor: "#ffc107", padding: "6px 10px", borderRadius: 4 }}>
                      {t("编辑", lang)}
                    </button>
                    <button onClick={() => handleDelete(acc.id)} style={{ backgroundColor: "red", color: "white", padding: "6px 10px", borderRadius: 4 }}>
                      {t("删除", lang)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
