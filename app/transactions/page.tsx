"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "../types";
import * as XLSX from "xlsx";

const categoryOptions: Record<string, string[]> = {
  "食物": ["买菜", "餐厅/外卖", "工作餐（JH）", "工作餐（LJS）", "饮品/甜品", "其他"],
  "车辆": ["汽车保险", "LEXUS贷款", "LEXUS加油", "Dodge加油", "LEXUS修车保养", "Dodge修车保养", "其他"],
  "工程": ["自家工程", "客户工程", "其他"],
  "房屋": ["房贷", "网费", "水费", "电费", "燃气费", "手机费", "房屋保险", "其他", "地税"],
  "家用": ["厨房用品", "家居用品", "卫浴用品", "家居装饰", "其他"],
  "教育": ["课外课程", "学校费用", "书籍/软件", "考试费用", "学习用品", "运动/活动", "爸妈教育", "其他费用"],
  "服饰": ["鞋包/饰品", "衣服", "美发美甲", "护肤美容", "其他"],
  "休闲": ["会员", "门票/项目费用", "住宿", "交通", "餐饮", "其他"],
  "医疗": ["牙医","药物", "门诊", "其他"],
  "转账": ["还信用卡", "内部转账", "其他"],
  "补贴": ["平帐补贴",  "其他"],
  "其他": ["其他"]
};

export default function TransactionsPage() {
  const [userId, setUserId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Transaction, "id">>({
    user_id: "",
    account_id: "",
    date: "",
    type: "支出",
    category: "",
    subcategory: "",
    amount: undefined as unknown as number,
    currency: "CAD",
    note: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setFormData((f) => ({ ...f, user_id: user.id }));
        fetchTransactions(user.id);
        fetchAccounts();
      }
    });
  }, []);

  const fetchTransactions = async (uid: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false });
    if (data) setTransactions(data);
  };

  const fetchAccounts = async () => {
    const { data } = await supabase.from("accounts").select("id, name");
    if (data) setAccounts(data);
  };

  const exportToExcel = () => {
    const formatted = transactions.map((t) => {
      const account = accounts.find((a) => a.id === t.account_id);
      return {
        日期: t.date,
        类型: t.type,
        分类: t.category,
        二级分类: t.subcategory,
        金额: t.amount,
        账户: account?.name || t.account_id,
        币种: t.currency,
        备注: t.note,
      };
    });
  
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "transactions.xlsx");
  };
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" && value !== "" ? Number(value) : value,
      ...(name === "category" ? { subcategory: "" } : {})
    }));
  };

  const handleSave = async () => {
    const table = supabase.from("transactions");
    const action = editingId
      ? table.update(formData).eq("id", editingId)
      : table.insert([formData]);

    const { error } = await action;
    if (!error) {
      setShowForm(false);
      setEditingId(null);
      fetchTransactions(userId);
    } else {
      alert("❌ 操作失败：" + error.message);
    }
  };

  const handleEdit = (t: Transaction) => {
    setFormData({ ...t });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) fetchTransactions(userId);
    else alert("❌ 删除失败：" + error.message);
  };

  const cellStyle = {
    border: "1px solid #ccc",
    padding: "6px 8px",
    textAlign: "left" as const,
  };

  const thStyle = {
    ...cellStyle,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📁 收入 / 支出记录</h2>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => { setShowForm(true); setFormData((f) => ({ ...f, amount: undefined as unknown as number })); setEditingId(null); }}
          style={{ backgroundColor: "green", color: "white", padding: "6px 12px", border: "none", marginRight: 10 }}
        >＋ 添加记录</button>
        <button
          onClick={exportToExcel}
          style={{ backgroundColor: "#007bff", color: "white", padding: "6px 12px", border: "none" }}
        >导出为 Excel</button>
      </div>

      {showForm && (
        <div style={{ padding: 12, border: "1px solid #ccc", marginBottom: 16, background: "#f9f9f9" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <label>日期 <input type="date" name="date" value={formData.date} onChange={handleInputChange} /></label>
            <label>类型
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="支出">支出</option>
                <option value="收入">收入</option>
              </select>
            </label>
            <label>分类
              <select name="category" value={formData.category} onChange={handleInputChange}>
                <option value="">选择分类</option>
                {Object.keys(categoryOptions).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label>二级分类
              <select name="subcategory" value={formData.subcategory} onChange={handleInputChange}>
                <option value="">选择二级分类</option>
                {(categoryOptions[formData.category] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </label>
            <label>金额 <input name="amount" type="number" value={formData.amount ?? ""} onChange={handleInputChange} /></label>
            <label>账户
              <select name="account_id" value={formData.account_id} onChange={handleInputChange}>
                <option value="">选择账户</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </label>
            <label>币种 <input name="currency" value={formData.currency} onChange={handleInputChange} /></label>
            <label>备注 <input name="note" value={formData.note} onChange={handleInputChange} /></label>
            <button onClick={handleSave} style={{ backgroundColor: "#007bff", color: "white", padding: "6px 12px" }}>保存</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "6px 12px" }}>取消</button>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
        <thead>
          <tr>
            {"日期 类型 分类 二级分类 金额 账户 币种 备注 操作".split(" ").map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const account = accounts.find((a) => a.id === t.account_id);
            return (
              <tr key={t.id}>
                <td style={cellStyle}>{t.date}</td>
                <td style={cellStyle}>{t.type}</td>
                <td style={cellStyle}>{t.category}</td>
                <td style={cellStyle}>{t.subcategory}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{t.amount}</td>
                <td style={cellStyle}>{account?.name || t.account_id}</td>
                <td style={cellStyle}>{t.currency}</td>
                <td style={cellStyle}>{t.note}</td>
                <td style={cellStyle}>
                  <button onClick={() => handleEdit(t)} style={{ backgroundColor: "#ffc107", border: "none", marginRight: 4 }}>编辑</button>
                  <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: "red", color: "white", border: "none" }}>删除</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
