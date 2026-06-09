"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AuthGuard from "@/components/AuthGuard";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";
import { supabase } from "@/lib/supabase";

const TRIP_KEY = "mexico-2026-summer";
const TRIP_NAME = "2026 墨西哥暑假旅行";
const DEFAULT_BUDGET_CAD = 10000;
const BUDGET_STORAGE_KEY = "travel_budget_mexico_2026_summer";

const recordTypeOptions = ["旅行支出", "资金注入", "对账调整"];
const statusOptions = ["估算中", "已入账", "现金已记录", "待复查", "已核算"];
const categoryOptions = [
  "机票",
  "酒店",
  "交通",
  "餐饮",
  "超市",
  "夏令营/学习",
  "门票/活动",
  "电话/网络",
  "购物",
  "现金取现",
  "手续费/汇差",
  "其他",
];
const currencyOptions = ["CAD", "MXN", "CNY", "USD"];
const paymentMethodOptions = [
  "RBC 信用卡",
  "RBC 借记卡",
  "CIBC 信用卡",
  "CIBC 支票账户",
  "微信支付",
  "支付宝",
  "中国借记卡",
  "墨西哥现金",
  "人民币现金",
  "其他",
];
const fundingSourceOptions = [
  "加拿大资金",
  "CIBC 外部资金",
  "中国人民币资金",
  "墨西哥现金池",
  "其他",
];

type TravelExpense = {
  id: number;
  user_id: string;
  trip_key: string;
  trip_name: string;
  date: string;
  record_type: string;
  category: string;
  description: string | null;
  original_amount: number | null;
  original_currency: string | null;
  charged_amount: number | null;
  charged_currency: string | null;
  cad_amount: number;
  payment_method: string | null;
  funding_source: string | null;
  status: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

type TravelForm = {
  date: string;
  record_type: string;
  category: string;
  description: string;
  original_amount: string;
  original_currency: string;
  charged_amount: string;
  charged_currency: string;
  cad_amount: string;
  payment_method: string;
  funding_source: string;
  status: string;
  note: string;
};

type SummaryRow = {
  key: string;
  cadTotal: number;
  chargedTotals?: Record<string, number>;
};

const toLocalISODate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

const emptyForm = (): TravelForm => ({
  date: toLocalISODate(new Date()),
  record_type: "旅行支出",
  category: "其他",
  description: "",
  original_amount: "",
  original_currency: "CAD",
  charged_amount: "",
  charged_currency: "CAD",
  cad_amount: "",
  payment_method: "其他",
  funding_source: "其他",
  status: "估算中",
  note: "",
});

const money = (value: number) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toNumberOrNull = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumberOrZero = (value: string) => {
  const parsed = toNumberOrNull(value);
  return parsed ?? 0;
};

const isCostRecord = (expense: TravelExpense) =>
  expense.record_type === "旅行支出" || expense.record_type === "对账调整";

const addToSummary = (summary: Map<string, SummaryRow>, key: string, expense: TravelExpense) => {
  const safeKey = key || "未填写";
  const current = summary.get(safeKey) || {
    key: safeKey,
    cadTotal: 0,
    chargedTotals: {},
  };
  const chargedCurrency = expense.charged_currency || "未填写";

  current.cadTotal += Number(expense.cad_amount || 0);
  current.chargedTotals![chargedCurrency] =
    (current.chargedTotals![chargedCurrency] || 0) +
    Number(expense.charged_amount || 0);
  summary.set(safeKey, current);
};

const formatChargedTotals = (totals?: Record<string, number>) => {
  if (!totals) return "";
  return Object.entries(totals)
    .map(([currency, total]) => `${currency} ${money(total)}`)
    .join(" / ");
};

export default function TravelPage() {
  const { lang } = useLang();
  const [userId, setUserId] = useState("");
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [formData, setFormData] = useState<TravelForm>(() => emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isBudgetEditing, setIsBudgetEditing] = useState(false);
  const [travelBudget, setTravelBudget] = useState(DEFAULT_BUDGET_CAD);
  const [budgetInput, setBudgetInput] = useState(String(DEFAULT_BUDGET_CAD));
  const [loading, setLoading] = useState(true);

  const fetchTravelExpenses = async (uid: string) => {
    const { data, error } = await supabase
      .from("travel_expenses")
      .select("*")
      .eq("user_id", uid)
      .eq("trip_key", TRIP_KEY)
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      alert(`${t("加载失败：", lang)}${error.message}`);
      setExpenses([]);
    } else {
      setExpenses((data || []) as TravelExpense[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    const savedBudget = window.localStorage.getItem(BUDGET_STORAGE_KEY);
    const parsedBudget = savedBudget == null ? NaN : Number(savedBudget);

    if (Number.isFinite(parsedBudget) && parsedBudget >= 0) {
      setTravelBudget(parsedBudget);
      setBudgetInput(String(parsedBudget));
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      fetchTravelExpenses(user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const costExpenses = useMemo(
    () => expenses.filter(isCostRecord),
    [expenses],
  );

  const budgetSummary = useMemo(() => {
    const expectedTotal = costExpenses.reduce(
      (sum, expense) => sum + Number(expense.cad_amount || 0),
      0,
    );
    const settledTotal = costExpenses
      .filter((expense) => expense.status === "已核算" || expense.status === "已入账")
      .reduce((sum, expense) => sum + Number(expense.cad_amount || 0), 0);
    const pendingTotal = costExpenses
      .filter((expense) => expense.status === "估算中" || expense.status === "待复查")
      .reduce((sum, expense) => sum + Number(expense.cad_amount || 0), 0);

    return {
      expectedTotal,
      settledTotal,
      pendingTotal,
      remainingBudget: travelBudget - expectedTotal,
    };
  }, [costExpenses, travelBudget]);

  const categorySummary = useMemo(() => {
    const summary = new Map<string, SummaryRow>();
    costExpenses.forEach((expense) => addToSummary(summary, expense.category, expense));
    return Array.from(summary.values()).sort((a, b) => b.cadTotal - a.cadTotal);
  }, [costExpenses]);

  const paymentMethodSummary = useMemo(() => {
    const summary = new Map<string, SummaryRow>();
    costExpenses.forEach((expense) => addToSummary(summary, expense.payment_method || "", expense));
    return Array.from(summary.values()).sort((a, b) => b.cadTotal - a.cadTotal);
  }, [costExpenses]);

  const currencySummary = useMemo(() => {
    const summary = new Map<string, { currency: string; chargedTotal: number; cadTotal: number }>();

    costExpenses.forEach((expense) => {
      const currency = expense.charged_currency || "未填写";
      const current = summary.get(currency) || {
        currency,
        chargedTotal: 0,
        cadTotal: 0,
      };

      current.chargedTotal += Number(expense.charged_amount || 0);
      current.cadTotal += Number(expense.cad_amount || 0);
      summary.set(currency, current);
    });

    return Array.from(summary.values()).sort((a, b) => b.cadTotal - a.cadTotal);
  }, [costExpenses]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBudgetSave = () => {
    const nextBudget = Number(budgetInput);

    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      alert("请输入有效的预算金额");
      return;
    }

    setTravelBudget(nextBudget);
    window.localStorage.setItem(BUDGET_STORAGE_KEY, String(nextBudget));
    setIsBudgetEditing(false);
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!userId) {
      alert(t("用户信息获取失败，请重新登录", lang));
      return;
    }

    if (!formData.date || !formData.record_type || !formData.category) {
      alert("日期、记录类型、分类不能为空");
      return;
    }

    const payload = {
      user_id: userId,
      trip_key: TRIP_KEY,
      trip_name: TRIP_NAME,
      date: formData.date,
      record_type: formData.record_type,
      category: formData.category,
      description: formData.description.trim(),
      original_amount: toNumberOrNull(formData.original_amount),
      original_currency: formData.original_currency,
      charged_amount: toNumberOrNull(formData.charged_amount),
      charged_currency: formData.charged_currency,
      cad_amount: toNumberOrZero(formData.cad_amount),
      payment_method: formData.payment_method,
      funding_source: formData.funding_source,
      status: formData.status,
      note: formData.note.trim(),
    };

    const { error } = editingId
      ? await supabase
          .from("travel_expenses")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
      : await supabase.from("travel_expenses").insert(payload);

    if (error) {
      alert(`${t("保存失败：", lang)}${error.message}`);
      return;
    }

    resetForm();
    await fetchTravelExpenses(userId);
  };

  const handleEdit = (expense: TravelExpense) => {
    setFormData({
      date: expense.date,
      record_type: expense.record_type,
      category: expense.category,
      description: expense.description || "",
      original_amount: expense.original_amount == null ? "" : String(expense.original_amount),
      original_currency: expense.original_currency || "CAD",
      charged_amount: expense.charged_amount == null ? "" : String(expense.charged_amount),
      charged_currency: expense.charged_currency || "CAD",
      cad_amount: String(expense.cad_amount ?? 0),
      payment_method: expense.payment_method || "其他",
      funding_source: expense.funding_source || "其他",
      status: expense.status || "估算中",
      note: expense.note || "",
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("确定要删除这条记录吗？", lang))) return;

    const { error } = await supabase
      .from("travel_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      alert(`${t("删除失败：", lang)}${error.message}`);
      return;
    }

    await fetchTravelExpenses(userId);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const detailRows = expenses.map((expense) => ({
      日期: expense.date,
      记录类型: expense.record_type,
      分类: expense.category,
      说明: expense.description || "",
      原始金额: expense.original_amount ?? "",
      原始币种: expense.original_currency || "",
      实际扣款金额: expense.charged_amount ?? "",
      实际扣款币种: expense.charged_currency || "",
      折算加币金额: expense.cad_amount,
      付款方式: expense.payment_method || "",
      资金来源: expense.funding_source || "",
      状态: expense.status || "",
      备注: expense.note || "",
    }));

    const budgetRows = [
      { 项目: "总预算", 金额: travelBudget },
      { 项目: "预计总花费", 金额: budgetSummary.expectedTotal },
      { 项目: "已核算金额", 金额: budgetSummary.settledTotal },
      { 项目: "待核算金额", 金额: budgetSummary.pendingTotal },
      { 项目: "剩余预算", 金额: budgetSummary.remainingBudget },
    ];

    const categoryRows = categorySummary.map((row) => ({
      分类: row.key,
      折算CAD: row.cadTotal,
      实际扣款汇总: formatChargedTotals(row.chargedTotals),
    }));

    const paymentRows = paymentMethodSummary.map((row) => ({
      付款方式: row.key,
      折算CAD: row.cadTotal,
      实际扣款汇总: formatChargedTotals(row.chargedTotals),
    }));

    const currencyRows = currencySummary.map((row) => ({
      实际扣款币种: row.currency,
      实际扣款金额: row.chargedTotal,
      约折算CAD: row.cadTotal,
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "明细");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetRows), "预算汇总");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryRows), "分类汇总");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "付款方式汇总");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(currencyRows), "币种汇总");
    XLSX.writeFile(wb, `${TRIP_NAME}.xlsx`);
  };

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "white",
  };

  const thStyle = {
    border: "1px solid #ccc",
    padding: "8px 10px",
    backgroundColor: "#f0f0f0",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };

  const tdStyle = {
    border: "1px solid #ccc",
    padding: "8px 10px",
    verticalAlign: "middle" as const,
    whiteSpace: "nowrap" as const,
  };

  const ellipsisStyle = {
    ...tdStyle,
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const inputStyle = {
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <AuthGuard>
      <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1400 }}>
        <h2>🌎 {TRIP_NAME}账本</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            style={{ backgroundColor: "green", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}
          >
            ＋ {t("新增记录", lang)}
          </button>
          <button
            onClick={exportToExcel}
            style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}
          >
            ⬇️ {t("导出为Excel", lang)}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
          <div style={cardStyle}>
            <div style={{ color: "#666", fontSize: 13 }}>总预算</div>
            {isBudgetEditing ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                <input
                  type="number"
                  step="0.01"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  style={{ width: 110, padding: "4px 6px" }}
                />
                <button onClick={handleBudgetSave} style={{ padding: "4px 8px" }} type="button">
                  保存
                </button>
                <button
                  onClick={() => {
                    setBudgetInput(String(travelBudget));
                    setIsBudgetEditing(false);
                  }}
                  style={{ padding: "4px 8px" }}
                  type="button"
                >
                  取消
                </button>
              </div>
            ) : (
              <>
                <strong>CAD {money(travelBudget)}</strong>
                <button
                  onClick={() => setIsBudgetEditing(true)}
                  style={{ marginLeft: 8, padding: "3px 8px", fontSize: 12 }}
                  type="button"
                >
                  修改预算
                </button>
              </>
            )}
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#666", fontSize: 13 }}>预计总花费</div>
            <strong>CAD {money(budgetSummary.expectedTotal)}</strong>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#666", fontSize: 13 }}>已核算金额</div>
            <strong>CAD {money(budgetSummary.settledTotal)}</strong>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#666", fontSize: 13 }}>待核算金额</div>
            <strong>CAD {money(budgetSummary.pendingTotal)}</strong>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#666", fontSize: 13 }}>
              {budgetSummary.remainingBudget >= 0 ? "剩余预算" : "已超预算"}
            </div>
            <strong style={{ color: budgetSummary.remainingBudget >= 0 ? "green" : "red" }}>
              CAD {money(Math.abs(budgetSummary.remainingBudget))}
            </strong>
          </div>
        </div>

        {showForm && (
          <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 14, marginBottom: 18, backgroundColor: "#f9f9f9" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <label>
                日期
                <input type="date" name="date" value={formData.date} onChange={handleChange} style={inputStyle} />
              </label>
              <label>
                记录类型
                <select name="record_type" value={formData.record_type} onChange={handleChange} style={inputStyle}>
                  {recordTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                分类
                <select name="category" value={formData.category} onChange={handleChange} style={inputStyle}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                说明
                <input name="description" value={formData.description} onChange={handleChange} style={inputStyle} />
              </label>
              <label>
                原始金额
                <input type="number" step="0.01" name="original_amount" value={formData.original_amount} onChange={handleChange} style={inputStyle} />
              </label>
              <label>
                原始币种
                <select name="original_currency" value={formData.original_currency} onChange={handleChange} style={inputStyle}>
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                实际扣款金额
                <input type="number" step="0.01" name="charged_amount" value={formData.charged_amount} onChange={handleChange} style={inputStyle} />
              </label>
              <label>
                实际扣款币种
                <select name="charged_currency" value={formData.charged_currency} onChange={handleChange} style={inputStyle}>
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                折算加币金额
                <input type="number" step="0.01" name="cad_amount" value={formData.cad_amount} onChange={handleChange} style={inputStyle} />
              </label>
              <label>
                付款方式
                <select name="payment_method" value={formData.payment_method} onChange={handleChange} style={inputStyle}>
                  {paymentMethodOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                资金来源
                <select name="funding_source" value={formData.funding_source} onChange={handleChange} style={inputStyle}>
                  {fundingSourceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                状态
                <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                备注
                <textarea name="note" value={formData.note} onChange={handleChange} rows={2} style={inputStyle} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={handleSave} style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
                {t("保存", lang)}
              </button>
              <button onClick={resetForm} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: 4, background: "white" }}>
                {t("取消", lang)}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsSummaryOpen((open) => !open)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            marginBottom: isSummaryOpen ? 12 : 18,
            border: "1px solid #ddd",
            borderRadius: 6,
            backgroundColor: "#f7f7f7",
            fontWeight: 700,
            cursor: "pointer",
          }}
          type="button"
        >
          📊 汇总详情 {isSummaryOpen ? "▼" : "▶"}
        </button>

        {isSummaryOpen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 18 }}>
            <SummaryTable title="按分类汇总" label="分类" rows={categorySummary} />
            <SummaryTable title="按付款方式汇总" label="付款方式" rows={paymentMethodSummary} />
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>按实际扣款币种汇总</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>币种</th>
                    <th style={thStyle}>实际扣款</th>
                    <th style={thStyle}>约 CAD</th>
                  </tr>
                </thead>
                <tbody>
                  {currencySummary.map((row) => (
                    <tr key={row.currency}>
                      <td style={tdStyle}>{row.currency}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{money(row.chargedTotal)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{money(row.cadTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <h3>明细</h3>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ minWidth: 1450, width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: "1px solid #ccc" }}>
            <colgroup>
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  "日期",
                  "记录类型",
                  "分类",
                  "说明",
                  "原始金额",
                  "原始币种",
                  "实际扣款",
                  "扣款币种",
                  "CAD金额",
                  "付款方式",
                  "资金来源",
                  "状态",
                  "备注",
                  "操作",
                ].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={14} style={{ ...tdStyle, textAlign: "center" }}>{t("加载中…", lang)}</td>
                </tr>
              )}
              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ ...tdStyle, textAlign: "center" }}>{t("暂无数据", lang)}</td>
                </tr>
              )}
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td style={tdStyle}>{expense.date}</td>
                  <td style={tdStyle}>{expense.record_type}</td>
                  <td style={tdStyle}>{expense.category}</td>
                  <td style={ellipsisStyle} title={expense.description || ""}>{expense.description}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{expense.original_amount ?? ""}</td>
                  <td style={tdStyle}>{expense.original_currency}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{expense.charged_amount ?? ""}</td>
                  <td style={tdStyle}>{expense.charged_currency}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(Number(expense.cad_amount || 0))}</td>
                  <td style={ellipsisStyle} title={expense.payment_method || ""}>{expense.payment_method}</td>
                  <td style={ellipsisStyle} title={expense.funding_source || ""}>{expense.funding_source}</td>
                  <td style={tdStyle}>{expense.status}</td>
                  <td style={ellipsisStyle} title={expense.note || ""}>{expense.note}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "row", gap: 8, flexWrap: "nowrap" }}>
                      <button
                        onClick={() => handleEdit(expense)}
                        style={{ backgroundColor: "#ffc107", padding: "4px 10px", border: "none", borderRadius: 4, whiteSpace: "nowrap" }}
                      >
                        {t("编辑", lang)}
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        style={{ backgroundColor: "red", color: "white", padding: "4px 10px", border: "none", borderRadius: 4, whiteSpace: "nowrap" }}
                      >
                        {t("删除", lang)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGuard>
  );
}

function SummaryTable({
  title,
  label,
  rows,
}: {
  title: string;
  label: string;
  rows: SummaryRow[];
}) {
  const thStyle = {
    border: "1px solid #ccc",
    padding: "8px 10px",
    backgroundColor: "#f0f0f0",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  };
  const tdStyle = {
    border: "1px solid #ccc",
    padding: "8px 10px",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, backgroundColor: "white" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>{label}</th>
            <th style={thStyle}>折算 CAD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={tdStyle}>{row.key}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{money(row.cadTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
