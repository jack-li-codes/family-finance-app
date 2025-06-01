"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import * as XLSX from "xlsx";


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

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
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
    fetchAccounts();
  }, []);

  useEffect(() => {
    const totals: Record<string, number> = {};
    accounts.forEach((acc) => {
      const amount = Number(acc.balance ?? 0) + Number(acc.initial_balance ?? 0);
      const currency = acc.currency ?? "UNKNOWN";
      if (!totals[currency]) totals[currency] = 0;
      totals[currency] += amount;
    });
    setTotalBalanceMap(totals);
  }, [accounts]);

  const fetchAccounts = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setAccounts(data as Account[]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAccount((prev) => ({
      ...prev,
      [name]: ["balance", "initial_balance"].includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!newAccount.name || !newAccount.owner) {
      alert("账户名称和所有人不能为空");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("未登录用户，无法添加账户");
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
      console.error("保存失败：", error.message);
      alert("保存失败：" + error.message);
      return;
    }

    setShowForm(false);
    resetForm();
    fetchAccounts();
  };

  const handleEdit = (account: Account) => {
    const { id, ...rest } = account;
    setNewAccount(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个账户吗？")) {
      await supabase.from("accounts").delete().eq("id", id);
      fetchAccounts();
    }
  };

  const exportToExcel = () => {
    const formatted = accounts.map((acc) => ({
      账户名称: acc.name,
      分类: acc.category,
      所有人: acc.owner,
      余额: acc.balance,
      币种: acc.currency,
      卡号: acc.card_number,
      备注: acc.note,
      初始余额: acc.initial_balance,
      起始日期: acc.initial_date ?? "",
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
      initial_date: null,
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
        <h1>🏠 家庭账户管理</h1>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>
            家庭账户总余额：
            {Object.entries(totalBalanceMap).map(([currency, amount]) => (
              <div key={currency}>
                {currency}：
                <span style={{ color: amount >= 0 ? "green" : "red" }}>
                  {amount.toFixed(2)} {amount >= 0 ? "（正）" : "（负）"}
                </span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: "#fffbe6", padding: "16px 24px", border: "1px solid #f0e6c8", borderRadius: 6, fontSize: "14px", flex: 1 }}>
            <strong style={{ display: "block", marginBottom: "8px" }}>📅 当前月份固定花销:</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
              <div>房贷: 4482.28（每月28号）</div>
              <div>汽车保险: 497.13（每月23号）</div>
              <div>房屋保险: 208.02（每月23号）</div>
              <div>车 lease: 817.22（每月10号）</div>
              <div>地税: 1560（4月1次，6月25号）</div>
              <div>水电: 约130（每月20号）</div>
              <div>煤气: 约130（每月20号）</div>
              <div>宽带: 74（每月5号，LJS信用卡）</div>
              <div>电话费: 169.47（每月25号，JH信用卡）</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setShowForm(!showForm); resetForm(); }} style={{ backgroundColor: "green", color: "white", padding: "8px 16px", borderRadius: 4 }}>
            ➕ 添加账户
          </button>
          <button onClick={exportToExcel} style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px", borderRadius: 4 }}>
            📤 导出为 Excel
          </button>
        </div>

        {showForm && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: "1px solid #ccc" }}>
            <thead>
              <tr>
                {["账户名称", "分类", "所有人", "余额", "币种", "卡号", "备注", "初始余额", "起始日期"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["name", "category", "owner", "balance", "currency", "card_number", "note", "initial_balance", "initial_date"].map((key) => (
                  <td key={key} style={tdStyle}>
                    <input name={key} type={key.includes("balance") ? "number" : key === "initial_date" ? "date" : "text"} value={(newAccount as any)[key] ?? ""} onChange={handleChange} style={{ padding: 6, width: "100%", boxSizing: "border-box" }} />
                  </td>
                ))}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} style={{ textAlign: "left", padding: 16 }}>
                  <button onClick={handleSave} style={{ backgroundColor: "#0d6efd", color: "white", padding: "8px 16px", borderRadius: 4 }}>
                    保存
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {["账户名称", "分类", "所有人", "余额", "币种", "卡号", "备注", "初始余额", "起始日期", "操作"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td style={tdStyle}>{acc.name}</td>
                <td style={tdStyle}>{acc.category}</td>
                <td style={tdStyle}>{acc.owner}</td>
                <td style={tdStyle}>{acc.balance}</td>
                <td style={tdStyle}>{acc.currency}</td>
                <td style={tdStyle}>{acc.card_number}</td>
                <td style={tdStyle}>{acc.note}</td>
                <td style={tdStyle}>{acc.initial_balance}</td>
                <td style={tdStyle}>{acc.initial_date ?? ""}</td>
                <td style={{ ...tdStyle }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(acc)} style={{ backgroundColor: "#ffc107", padding: "6px 10px", borderRadius: 4 }}>编辑</button>
                    <button onClick={() => handleDelete(acc.id)} style={{ backgroundColor: "red", color: "white", padding: "6px 10px", borderRadius: 4 }}>删除</button>
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
