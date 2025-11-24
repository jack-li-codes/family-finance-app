"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "../types";
import * as XLSX from "xlsx";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

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

// Generate local timezone YYYY-MM-DD (avoid date shift across timezones)
const toLocalISODate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

export default function TransactionsPage() {
  const { lang } = useLang();

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
        fetchAccounts(user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async (uid: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false });
    if (error) {
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
      return;
    }
    if (data) setTransactions(data);
  };

  const fetchAccounts = async (uid: string) => {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", uid);
    if (error) {
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
      return;
    }
    if (data) setAccounts(data);
  };

  const exportToExcel = () => {
    const formatted = transactions.map((t0) => {
      const account = accounts.find((a) => a.id === t0.account_id);
      return {
        [t("日期", lang)]: t0.date,
        [t("类型", lang)]: t0.type,
        [t("分类", lang)]: t(t0.category || "", lang),
        [t("二级分类", lang)]: t(t0.subcategory || "", lang),
        [t("金额", lang)]: t0.amount,
        [t("账户", lang)]: account?.name || t0.account_id,
        [t("币种", lang)]: t0.currency,
        [t("备注", lang)]: t0.note,
      };
    });

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      lang === "zh" ? "收入支出" : "Transactions"
    );
    XLSX.writeFile(wb, (lang === "zh" ? "收入支出" : "Transactions") + ".xlsx");
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
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
    }
  };

  const handleEdit = (t0: Transaction) => {
    setFormData({ ...t0 });
    setEditingId(t0.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("确定要删除这条记录吗？", lang))) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) fetchTransactions(userId);
    else alert(`${t("❌ 删除失败：", lang)}${error.message}`);
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

  const tableHeaders = [
    t("日期", lang),
    t("类型", lang),
    t("分类", lang),
    t("二级分类", lang),
    t("金额", lang),
    t("账户", lang),
    t("币种", lang),
    t("备注", lang),
    t("操作", lang),
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>📁 {t("收入/支出", lang)}</h2>

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData((f) => ({
              ...f,
              // When adding new entry, auto-set date to "today" (if not already set)
              date: f.date || toLocalISODate(new Date()),
              amount: undefined as unknown as number
            }));
          }}
          style={{ backgroundColor: "green", color: "white", padding: "6px 12px", border: "none", marginRight: 10 }}
        >
          ＋ {t("新增", lang)}
        </button>

        <button
          onClick={exportToExcel}
          style={{ backgroundColor: "#007bff", color: "white", padding: "6px 12px", border: "none" }}
        >
          {t("导出为Excel", lang)}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: 12, border: "1px solid #ccc", marginBottom: 16, background: "#f9f9f9" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <label>
              {t("日期", lang)}{" "}
              {/* 统一使用原生 date，点击弹日历；返回值就是 YYYY-MM-DD */}
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
              />
            </label>

            <label>
              {t("类型", lang)}
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="支出">{t("支出", lang)}</option>
                <option value="收入">{t("收入", lang)}</option>
              </select>
            </label>

            <label>
              {t("分类", lang)}
              <select name="category" value={formData.category} onChange={handleInputChange}>
                <option value="">{t("选择分类", lang)}</option>
                {Object.keys(categoryOptions).map((cat) => (
                  <option key={cat} value={cat}>
                    {t(cat, lang)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("二级分类", lang)}
              <select name="subcategory" value={formData.subcategory} onChange={handleInputChange} disabled={!formData.category}>
                <option value="">{t("选择二级分类", lang)}</option>
                {(categoryOptions[formData.category || ""] || []).map((sub) => (
                  <option key={sub} value={sub}>
                    {t(sub, lang)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("金额", lang)}{" "}
              <input name="amount" type="number" value={formData.amount ?? ""} onChange={handleInputChange} />
            </label>

            <label>
              {t("账户", lang)}
              <select name="account_id" value={formData.account_id} onChange={handleInputChange}>
                <option value="">{t("选择账户", lang)}</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("币种", lang)}{" "}
              <input name="currency" value={formData.currency} onChange={handleInputChange} />
            </label>

            <label>
              {t("备注", lang)}{" "}
              <input name="note" value={formData.note} onChange={handleInputChange} />
            </label>

            <button
              onClick={handleSave}
              style={{ backgroundColor: "#007bff", color: "white", padding: "6px 12px", border: "none" }}
            >
              {t("保存", lang)}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "6px 12px", border: "1px solid #ccc", background: "#fff" }}
            >
              {t("取消", lang)}
            </button>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
        <thead>
          <tr>
            {tableHeaders.map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t0) => {
            const account = accounts.find((a) => a.id === t0.account_id);
            return (
              <tr key={t0.id}>
                <td style={cellStyle}>{t0.date}</td>
                <td style={cellStyle}>{t0.type}</td>
                <td style={cellStyle}>{t(t0.category || "", lang)}</td>
                <td style={cellStyle}>{t(t0.subcategory || "", lang)}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{t0.amount}</td>
                <td style={cellStyle}>{account?.name || t0.account_id}</td>
                <td style={cellStyle}>{t0.currency}</td>
                <td style={cellStyle}>{t0.note}</td>
                <td style={cellStyle}>
                  <button
                    onClick={() => handleEdit(t0)}
                    style={{ backgroundColor: "#ffc107", border: "none", marginRight: 4, padding: "4px 8px" }}
                  >
                    {t("编辑", lang)}
                  </button>
                  <button
                    onClick={() => handleDelete(t0.id)}
                    style={{ backgroundColor: "red", color: "white", border: "none", padding: "4px 8px" }}
                  >
                    {t("删除", lang)}
                  </button>
                </td>
              </tr>
            );
          })}
          {transactions.length === 0 && (
            <tr>
              <td style={{ ...cellStyle, textAlign: "center" }} colSpan={9}>
                {t("暂无数据", lang)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
