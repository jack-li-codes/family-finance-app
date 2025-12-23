"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";
// Added: Import demo and real fixed expenses configurations
import { demoFixedExpenses, realFixedExpenses, type FixedExpense as ConfigFixedExpense } from "@/components/fixedExpensesConfig";

type FixedExpense = {
  id?: number;
  name: string;
  amount: number | string;
  note: string;
  icon: string;
  currency: string;
  sort_order: number | string;
  is_active: boolean;
};

// Added: Helper function to check if user is a demo user
const isDemoEmail = (email?: string | null) =>
  email === "demo1@example.com" || email === "demo2@example.com";

export default function FixedExpensesPage() {
  const { lang } = useLang();
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FixedExpense>({
    name: "",
    amount: "",
    note: "",
    icon: "",
    currency: "CAD",
    sort_order: "",
    is_active: true,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Added: Track if current user is a demo user
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => handler(e);
    mql.addEventListener?.("change", listener);

    return () => mql.removeEventListener?.("change", listener);
  }, []);

  const fetchExpenses = async () => {
    try {
      // Added: Get current user email to determine data source
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;

      // Added: Switch between demo and real fixed expenses based on login email
      if (isDemoEmail(email)) {
        // Demo user: Use local demo data, do not access database
        console.log("Demo user detected, using demo fixed expenses");
        setIsDemoUser(true);
        setExpenses(demoFixedExpenses as any);
        return;
      }

      // Real user: Query from database
      setIsDemoUser(false);
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching expenses:", error);
        setExpenses([]);
        showToast(t("加载失败：", lang) + error.message);
      } else {
        // If database is empty, set empty array
        setExpenses(data || []);
      }
    } catch (err) {
      console.error("Unexpected error in fetchExpenses:", err);
      setExpenses([]);
      showToast(lang === "zh" ? "加载失败" : "Failed to load");
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      note: "",
      icon: "",
      currency: "CAD",
      sort_order: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    console.log("[handleSubmit] Starting save operation...", { editingId, formData });

    // Validation - ensure name exists and is a string
    if (!formData.name || typeof formData.name !== 'string' || !formData.name.trim()) {
      showToast(lang === "zh" ? "名称不能为空" : "Name is required");
      return;
    }

    // Parse and validate amount
    const amountStr = String(formData.amount || '0');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      showToast(lang === "zh" ? "金额必须是有效的正数" : "Amount must be a valid positive number");
      return;
    }

    // Parse sort order with default
    const sortOrderStr = String(formData.sort_order || '0');
    const sortOrder = parseInt(sortOrderStr) || 0;

    // Build payload with proper defaults for all fields
    const payload = {
      name: formData.name.trim(),
      amount,
      note: (formData.note || '').toString().trim(),
      icon: (formData.icon || '').toString().trim(),
      currency: formData.currency || 'CAD',
      sort_order: sortOrder,
      is_active: formData.is_active === false ? false : true, // Ensure boolean
    };

    console.log("[handleSubmit] Payload:", payload);

    // Added: For demo users, only update local state, do not write to database
    if (isDemoUser) {
      if (editingId) {
        // Update existing expense in local state
        setExpenses(prev => prev.map(exp =>
          exp.id === editingId ? { ...payload, id: editingId } : exp
        ));
      } else {
        // Add new expense to local state
        const newId = Math.max(...expenses.map(e => e.id || 0), 0) + 1;
        setExpenses(prev => [...prev, { ...payload, id: newId }]);
      }
      showToast(lang === "zh" ? "（演示模式）保存成功" : "(Demo mode) Saved successfully");
      resetForm();
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast(lang === "zh" ? "用户未登录" : "User not logged in");
        return;
      }

      // Perform insert or update
      const { data, error } = editingId
        ? await supabase.from("fixed_expenses").update(payload).eq("id", editingId).eq("user_id", user.id)
        : await supabase.from("fixed_expenses").insert({ ...payload, user_id: user.id });

      if (error) {
        console.error("[Save Error] Full error object:", error);
        console.error("[Save Error] Error code:", error.code);
        console.error("[Save Error] Error message:", error.message);
        console.error("[Save Error] Error details:", error.details);
        console.error("[Save Error] Error hint:", error.hint);

        const errorMsg = error.message || JSON.stringify(error);
        showToast(`${lang === "zh" ? "保存失败" : "Save failed"}: ${errorMsg}`);
      } else {
        console.log("[handleSubmit] Save successful!", data);
        showToast(lang === "zh" ? "保存成功" : "Saved successfully");
        resetForm();
        fetchExpenses();
      }
    } catch (err: any) {
      console.error("[Save Exception] Unexpected error:", err);
      const errMsg = err?.message || String(err);
      showToast(`${lang === "zh" ? "保存失败" : "Save failed"}: ${errMsg}`);
    }
  };

  const handleEdit = (expense: FixedExpense) => {
    setFormData({
      name: expense.name,
      amount: expense.amount,
      note: expense.note,
      icon: expense.icon,
      currency: expense.currency,
      sort_order: expense.sort_order,
      is_active: expense.is_active,
    });
    setEditingId(expense.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang === "zh" ? "确定要删除这条记录吗？" : "Are you sure you want to delete this record?")) {
      return;
    }

    // Added: For demo users, only update local state
    if (isDemoUser) {
      setExpenses(prev => prev.map(exp =>
        exp.id === id ? { ...exp, is_active: false } : exp
      ));
      showToast(lang === "zh" ? "（演示模式）删除成功" : "(Demo mode) Deleted successfully");
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast(lang === "zh" ? "用户未登录" : "User not logged in");
      return;
    }

    // Soft delete by default
    const { data, error } = await supabase
      .from("fixed_expenses")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    const affected = data?.length ?? 0;

    if (error) {
      console.error("Delete error:", error);
      showToast(t("删除失败：", lang) + error.message);
    } else if (affected === 0) {
      showToast(lang === "zh"
        ? "未删除任何记录（可能记录不存在或无权限）"
        : "No records deleted (record may not exist or no permission)");
    } else {
      showToast(lang === "zh" ? "删除成功" : "Deleted successfully");
      fetchExpenses();
    }
  };

  const handleHardDelete = async (id: number) => {
    if (!confirm(lang === "zh" ? "确定要永久删除这条记录吗？此操作不可恢复。" : "Permanently delete this record? This cannot be undone.")) {
      return;
    }

    // Added: For demo users, only update local state
    if (isDemoUser) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      showToast(lang === "zh" ? "（演示模式）永久删除成功" : "(Demo mode) Permanently deleted");
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast(lang === "zh" ? "用户未登录" : "User not logged in");
      return;
    }

    const { data, error } = await supabase
      .from("fixed_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    const affected = data?.length ?? 0;

    if (error) {
      console.error("Hard delete error:", error);
      showToast(t("删除失败：", lang) + error.message);
    } else if (affected === 0) {
      showToast(lang === "zh"
        ? "未删除任何记录（可能记录不存在或无权限）"
        : "No records deleted (record may not exist or no permission)");
    } else {
      showToast(lang === "zh" ? "永久删除成功" : "Permanently deleted");
      fetchExpenses();
    }
  };

  const handleRestore = async (id: number) => {
    // Added: For demo users, only update local state
    if (isDemoUser) {
      setExpenses(prev => prev.map(exp =>
        exp.id === id ? { ...exp, is_active: true } : exp
      ));
      showToast(lang === "zh" ? "（演示模式）恢复成功" : "(Demo mode) Restored successfully");
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast(lang === "zh" ? "用户未登录" : "User not logged in");
      return;
    }

    const { error } = await supabase
      .from("fixed_expenses")
      .update({ is_active: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Restore error:", error);
      showToast(lang === "zh" ? "恢复失败" : "Restore failed");
    } else {
      showToast(lang === "zh" ? "恢复成功" : "Restored successfully");
      fetchExpenses();
    }
  };

  const handleImportTemplate = async () => {
    setImportError(null);

    // Added: Prevent demo users from importing templates
    if (isDemoUser) {
      showToast(lang === "zh"
        ? "（演示模式）演示用户无法导入模板"
        : "(Demo mode) Demo users cannot import templates");
      return;
    }

    // Check if there are existing active rows
    const activeExpenses = expenses.filter(exp => exp.is_active);
    if (activeExpenses.length > 0) {
      const confirmMsg = lang === "zh"
        ? "表内已有数据，是否按模板覆盖/更新？"
        : "Table already has data. Overwrite/update with template?";
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    console.info("📥 Import Template: Starting upsert operation...");
    console.info("ℹ️  Requirements: Unique index on 'user_id,name' columns and RLS policies must be configured.");
    console.info("📖 Documentation: See docs/fixed_expenses_setup.md");

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast(lang === "zh" ? "用户未登录" : "User not logged in");
      return;
    }

    // Template data - EXACT format as requested
    // Template data - English version for demo & reporting
    const payload = [
      {
        user_id: user.id,
        icon: "🏠",
        name: "Mortgage",
        amount: 4482.28,
        note: "(Paid on 28th of each month)",
        currency: "CAD",
        sort_order: 10,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "🚗",
        name: "Car Insurance",
        amount: 497.13,
        note: "(Paid on 23rd of each month)",
        currency: "CAD",
        sort_order: 20,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "🏡",
        name: "Home Insurance",
        amount: 208.02,
        note: "(Paid on 23rd of each month)",
        currency: "CAD",
        sort_order: 30,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "🚘",
        name: "Car Lease",
        amount: 817.22,
        note: "(Paid on 10th of each month)",
        currency: "CAD",
        sort_order: 40,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "📅",
        name: "Property Tax",
        amount: 1560,
        note: "(Once in April, once on June 25th)",
        currency: "CAD",
        sort_order: 50,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "💡",
        name: "Electricity",
        amount: 130,
        note: "(Around the 20th each month, estimate)",
        currency: "CAD",
        sort_order: 60,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "🔥",
        name: "Gas",
        amount: 130,
        note: "(Around the 20th each month, estimate)",
        currency: "CAD",
        sort_order: 70,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "🌐",
        name: "Internet",
        amount: 74,
        note: "(5th of each month, Credit Card A)",
        currency: "CAD",
        sort_order: 80,
        is_active: true,
      },
      {
        user_id: user.id,
        icon: "📱",
        name: "Mobile Phone",
        amount: 169.47,
        note: "(25th of each month, Credit Card B)",
        currency: "CAD",
        sort_order: 90,
        is_active: true,
      },
    ];


    try {
      // Upsert based on user_id,name
      const { error } = await supabase
        .from("fixed_expenses")
        .upsert(payload, {
          onConflict: 'user_id,name',
          ignoreDuplicates: false
        });

      if (error) {
        console.error("❌ Import error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);

        // Set specific error message based on error type
        // Safely convert error.message to string and check content
        const errorMsg = error.message || JSON.stringify(error) || "Unknown error";
        const errorMsgStr = String(errorMsg);

        if (errorMsgStr.includes("no unique or exclusion constraint") ||
            errorMsgStr.includes("there is no unique")) {
          const detailedMsg = lang === "zh"
            ? `唯一索引缺失：${errorMsg}`
            : `Missing unique index: ${errorMsg}`;
          setImportError(lang === "zh"
            ? "⚠️ 缺少唯一索引 'fixed_expenses_name_key'。请在 Supabase 运行 SQL：supabase/sql/fixed_expenses_setup.sql"
            : "⚠️ Missing unique index 'fixed_expenses_name_key'. Run SQL: supabase/sql/fixed_expenses_setup.sql");
          showToast(lang === "zh" ? `导入失败：${detailedMsg}` : `Import failed: ${detailedMsg}`);
        } else if (errorMsgStr.includes("violates row-level security") ||
                   errorMsgStr.includes("policy")) {
          const detailedMsg = lang === "zh"
            ? `RLS 策略错误：${errorMsg}`
            : `RLS policy error: ${errorMsg}`;
          setImportError(lang === "zh"
            ? "⚠️ RLS 策略未配置。请在 Supabase 运行 SQL：supabase/sql/fixed_expenses_setup.sql"
            : "⚠️ RLS policies not configured. Run SQL: supabase/sql/fixed_expenses_setup.sql");
          showToast(lang === "zh" ? `导入失败：${detailedMsg}` : `Import failed: ${detailedMsg}`);
        } else {
          setImportError(`❌ ${errorMsg}`);
          showToast(lang === "zh" ? `导入失败：${errorMsg}` : `Import failed: ${errorMsg}`);
        }
      } else {
        console.log("✅ Import successful! Imported 9 expense items.");
        setImportError(null);
        showToast(lang === "zh" ? "导入成功" : "Import successful");
        fetchExpenses();
      }
    } catch (err: any) {
      console.error("❌ Import exception:", err);
      const errMsg = err?.message || String(err);
      setImportError(`❌ ${errMsg}`);
      showToast(lang === "zh" ? `导入失败：${errMsg}` : `Import failed: ${errMsg}`);
    }
  };

  const thStyle = {
    border: "1px solid #ccc",
    padding: "10px 12px",
    backgroundColor: "#f1f1f1",
    textAlign: "left" as const,
    fontSize: "14px",
  };

  const tdStyle = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    verticalAlign: "middle" as const,
    fontSize: "13px",
  };

  const inputStyle = {
    padding: "6px 10px",
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <AuthGuard>
      <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: 1400, marginLeft: 0, marginRight: "auto" }}>
        <h2>💰 {t("固定花销管理", lang)}</h2>

        {/* Toast notification */}
        {toast && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: "#4caf50",
              color: "white",
              padding: "12px 24px",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              zIndex: 1000,
            }}
          >
            {toast}
          </div>
        )}

        {/* Environment check hint */}
        {expenses.length === 0 && (
          <div style={{
            backgroundColor: "#f5f5f5",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            color: "#666",
            fontSize: "13px"
          }}>
            💡 {lang === "zh"
              ? "提示：首次使用前请在 Supabase 运行 SQL（docs/fixed_expenses_setup.md）以创建唯一索引与 RLS 策略。"
              : "Tip: Before first use, run SQL in Supabase (docs/fixed_expenses_setup.md) to create unique index and RLS policies."}
          </div>
        )}

        <div style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            style={{
              backgroundColor: "green",
              color: "white",
              padding: "10px 20px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {showForm ? (lang === "zh" ? "取消" : "Cancel") : `➕ ${t("新增", lang)}`}
          </button>
          <button
            onClick={handleImportTemplate}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              padding: "10px 20px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            📥 {lang === "zh" ? "一键导入模板" : "Import Template"}
          </button>
        </div>

        {/* Import error display */}
        {importError && (
          <div style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            color: "#856404",
            fontSize: "13px",
            lineHeight: "1.5"
          }}>
            {importError}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{ backgroundColor: "#f9f9f9", padding: 20, border: "1px solid #ddd", borderRadius: 6, marginBottom: 24 }}>
            <h3>{editingId ? (lang === "zh" ? "编辑项目" : "Edit Item") : (lang === "zh" ? "新增项目" : "Add Item")}</h3>

            {isMobile ? (
              <MobileFixedExpenseForm
                value={formData}
                onChange={setFormData}
                onSave={handleSubmit}
                onCancel={resetForm}
                isEditing={!!editingId}
                lang={lang}
              />
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: "60px" }}>{lang === "zh" ? "图标" : "Icon"}</th>
                      <th style={{ ...thStyle, width: "200px" }}>{lang === "zh" ? "名称" : "Name"} *</th>
                      <th style={{ ...thStyle, width: "120px" }}>{lang === "zh" ? "金额" : "Amount"} *</th>
                      <th style={{ ...thStyle, width: "80px" }}>{lang === "zh" ? "币种" : "Currency"}</th>
                      <th style={thStyle}>{lang === "zh" ? "备注" : "Note"}</th>
                      <th style={{ ...thStyle, width: "80px" }}>{lang === "zh" ? "排序" : "Sort"}</th>
                      <th style={{ ...thStyle, width: "80px" }}>{lang === "zh" ? "启用" : "Active"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>
                        <input
                          name="icon"
                          value={formData.icon}
                          onChange={handleChange}
                          placeholder="📅"
                          style={{ ...inputStyle, textAlign: "center" }}
                          maxLength={4}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={lang === "zh" ? "例如：房贷" : "e.g., Mortgage"}
                          style={inputStyle}
                          required
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          style={inputStyle}
                          required
                        />
                      </td>
                      <td style={tdStyle}>
                        <select name="currency" value={formData.currency} onChange={handleChange} style={inputStyle}>
                          <option value="CAD">CAD</option>
                          <option value="USD">USD</option>
                          <option value="CNY">CNY</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input
                          name="note"
                          value={formData.note}
                          onChange={handleChange}
                          placeholder={lang === "zh" ? "（每月28号）" : "(Due on 28th)"}
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          name="sort_order"
                          type="number"
                          value={formData.sort_order}
                          onChange={handleChange}
                          placeholder="0"
                          style={inputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          name="is_active"
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={handleChange}
                          style={{ width: "20px", height: "20px" }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={handleSubmit}
                    style={{
                      backgroundColor: "#007bff",
                      color: "white",
                      padding: "10px 24px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      marginRight: 10,
                      fontSize: "14px",
                    }}
                  >
                    {t("保存", lang)}
                  </button>
                  <button
                    onClick={resetForm}
                    style={{
                      backgroundColor: "#6c757d",
                      color: "white",
                      padding: "10px 24px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {t("取消", lang)}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* List */}
        <h3>{lang === "zh" ? "所有项目" : "All Items"}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>{lang === "zh" ? "图标" : "Icon"}</th>
              <th style={thStyle}>{lang === "zh" ? "名称" : "Name"}</th>
              <th style={thStyle}>{lang === "zh" ? "金额" : "Amount"}</th>
              <th style={thStyle}>{lang === "zh" ? "币种" : "Currency"}</th>
              <th style={thStyle}>{lang === "zh" ? "备注" : "Note"}</th>
              <th style={thStyle}>{lang === "zh" ? "排序" : "Sort"}</th>
              <th style={thStyle}>{lang === "zh" ? "状态" : "Status"}</th>
              <th style={thStyle}>{t("操作", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                  {t("暂无数据。", lang)}
                </td>
              </tr>
            )}
            {expenses.map((exp) => (
              <tr key={exp.id} style={{ backgroundColor: exp.is_active ? "white" : "#f5f5f5" }}>
                <td style={tdStyle}>{exp.id}</td>
                <td style={{ ...tdStyle, textAlign: "center", fontSize: "18px" }}>{exp.icon}</td>
                <td style={tdStyle}>{exp.name}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{Number(exp.amount).toFixed(2)}</td>
                <td style={tdStyle}>{exp.currency}</td>
                <td style={{ ...tdStyle, color: "#666" }}>{exp.note}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{exp.sort_order}</td>
                <td style={tdStyle}>
                  <span style={{ color: exp.is_active ? "green" : "red", fontWeight: 500 }}>
                    {exp.is_active ? (lang === "zh" ? "启用" : "Active") : (lang === "zh" ? "禁用" : "Inactive")}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleEdit(exp)}
                      style={{
                        backgroundColor: "#ffc107",
                        padding: "4px 10px",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {t("编辑", lang)}
                    </button>
                    {exp.is_active ? (
                      <button
                        onClick={() => handleDelete(exp.id!)}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          padding: "4px 10px",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {t("删除", lang)}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestore(exp.id!)}
                        style={{
                          backgroundColor: "#28a745",
                          color: "white",
                          padding: "4px 10px",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        {lang === "zh" ? "恢复" : "Restore"}
                      </button>
                    )}
                    <button
                      onClick={() => handleHardDelete(exp.id!)}
                      style={{
                        backgroundColor: "#6c757d",
                        color: "white",
                        padding: "4px 10px",
                        border: "none",
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                      title={lang === "zh" ? "永久删除" : "Permanently delete"}
                    >
                      🗑️
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

// Mobile Form Component
function MobileFixedExpenseForm({
  value,
  onChange,
  onSave,
  onCancel,
  isEditing,
  lang,
}: {
  value: FixedExpense;
  onChange: (v: FixedExpense) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  lang: string;
}) {
  const [expandedNote, setExpandedNote] = useState(false);

  const handleInputChange = (field: keyof FixedExpense, inputValue: string | boolean) => {
    onChange({ ...value, [field]: inputValue });
  };

  const hasNote = value.note && value.note.trim() !== "";

  return (
    <>
      <div className="fe-card">
        <div className="fe-grid">
          <div className="fe-field">
            <label>{lang === "zh" ? "图标" : "Icon"}</label>
            <input
              value={value.icon ?? ""}
              onChange={(e) => handleInputChange("icon", e.target.value)}
              placeholder="📅"
              maxLength={4}
            />
          </div>

          <div className="fe-field">
            <label>{lang === "zh" ? "启用" : "Active"}</label>
            <input
              type="checkbox"
              checked={!!value.is_active}
              onChange={(e) => handleInputChange("is_active", e.target.checked)}
              className="checkbox-input"
            />
          </div>

          <div className="fe-field fe-span2">
            <label>{lang === "zh" ? "名称" : "Name"} *</label>
            <input
              value={value.name ?? ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder={lang === "zh" ? "例如：房贷" : "e.g., Mortgage"}
              required
            />
          </div>

          <div className="fe-field">
            <label>{lang === "zh" ? "金额" : "Amount"} *</label>
            <input
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              value={value.amount ?? ""}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="fe-field">
            <label>{lang === "zh" ? "币种" : "Currency"}</label>
            <select
              value={value.currency ?? "CAD"}
              onChange={(e) => handleInputChange("currency", e.target.value)}
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="fe-field">
            <label>{lang === "zh" ? "排序" : "Sort"}</label>
            <input
              inputMode="numeric"
              type="number"
              value={value.sort_order ?? ""}
              onChange={(e) => handleInputChange("sort_order", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="fe-field fe-span2">
            <div
              className="note-toggle"
              onClick={() => setExpandedNote(!expandedNote)}
            >
              <span className="note-label">
                {lang === "zh" ? "备注" : "Note"}
                {!expandedNote && (
                  <span className="note-hint">
                    {hasNote
                      ? ` • ${lang === "zh" ? "点击展开" : "Click to expand"}`
                      : ` • ${lang === "zh" ? "无" : "None"}`
                    }
                  </span>
                )}
              </span>
              <span className="toggle-icon">{expandedNote ? "▲" : "▼"}</span>
            </div>

            {expandedNote && (
              <textarea
                rows={3}
                value={value.note ?? ""}
                onChange={(e) => handleInputChange("note", e.target.value)}
                placeholder={lang === "zh" ? "填写备注..." : "Add note..."}
                className="note-textarea"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>

        <div className="fe-actions">
          <button className="btn-save" onClick={onSave}>
            {lang === "zh" ? "保存" : "Save"}
          </button>
          <button className="btn-cancel" onClick={onCancel}>
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .fe-card {
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 14px;
          background: #fff;
          margin: 12px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .fe-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fe-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 6px;
        }

        .fe-field input:not(.checkbox-input),
        .fe-field select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .fe-field input:focus,
        .fe-field select:focus {
          outline: none;
          border-color: #1677ff;
        }

        .checkbox-input {
          width: 22px;
          height: 22px;
          cursor: pointer;
        }

        .note-toggle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 12px;
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 10px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          margin-top: 6px;
        }

        .note-toggle:hover {
          background: #f0f0f0;
          border-color: #ccc;
        }

        .note-toggle:active {
          background: #e8e8e8;
        }

        .note-label {
          font-size: 13px;
          font-weight: 500;
          color: #444;
        }

        .note-hint {
          font-size: 12px;
          font-weight: 400;
          color: #888;
        }

        .toggle-icon {
          font-size: 12px;
          color: #999;
          transition: transform 0.2s;
        }

        .note-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 14px;
          box-sizing: border-box;
          resize: vertical;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          margin-top: 8px;
          min-height: 80px;
          transition: border-color 0.2s;
        }

        .note-textarea:focus {
          outline: none;
          border-color: #1677ff;
        }

        .fe-span2 {
          grid-column: span 2;
        }

        .fe-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #eee;
        }

        .btn-save {
          background: #1677ff;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-save:hover {
          background: #0958d9;
        }

        .btn-save:active {
          background: #003eb3;
        }

        .btn-cancel {
          background: #6c757d;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-cancel:hover {
          background: #5a6268;
        }

        .btn-cancel:active {
          background: #4e555b;
        }

        @media (max-width: 400px) {
          .fe-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .fe-span2 {
            grid-column: span 1;
          }
        }

        @media (max-width: 360px) {
          .fe-card {
            padding: 12px;
          }

          .fe-actions {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>
    </>
  );
}
