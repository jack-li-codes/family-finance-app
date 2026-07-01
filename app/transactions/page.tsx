"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Transaction } from "../types";
import * as XLSX from "xlsx";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";
import { categoryOptions } from "@/lib/category-options";
import { sortAccountsByPreferredOrder } from "@/lib/accountSort";

// Generate local timezone YYYY-MM-DD (avoid date shift across timezones)
const toLocalISODate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

const getTransactionMonth = (date: string) => {
  return date?.slice(0, 7) || "Unknown";
};

const getCurrentMonth = () => {
  return toLocalISODate(new Date()).slice(0, 7);
};

export default function TransactionsPage() {
  const { lang } = useLang();

  const [userId, setUserId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
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
    const transactionsToExport =
      selectedTransactionIds.length > 0
        ? transactions.filter((transaction) =>
            selectedTransactionIdSet.has(transaction.id),
          )
        : transactions;

    const formatted = transactionsToExport.map((t0) => {
      const account = accounts.find((a) => a.id === t0.account_id);
      return {
        [t("日期", lang)]: t0.date,
        [t("类型", lang)]: t(t0.type, lang),
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

  const groupedTransactions = useMemo(() => {
    const monthMap = new Map<string, Transaction[]>();

    transactions.forEach((transaction) => {
      const month = getTransactionMonth(transaction.date);
      const monthTransactions = monthMap.get(month) || [];

      monthTransactions.push(transaction);
      monthMap.set(month, monthTransactions);
    });

    return Array.from(monthMap, ([month, monthTransactions]) => ({
      month,
      transactions: monthTransactions,
    }));
  }, [transactions]);

  useEffect(() => {
    if (groupedTransactions.length === 0) {
      return;
    }

    const currentMonth = getCurrentMonth();
    const defaultOpenMonth = groupedTransactions.some(
      (group) => group.month === currentMonth,
    )
      ? currentMonth
      : groupedTransactions[0].month;

    setExpandedMonths((currentExpandedMonths) => {
      let changed = false;
      const nextExpandedMonths = { ...currentExpandedMonths };

      groupedTransactions.forEach((group) => {
        if (nextExpandedMonths[group.month] === undefined) {
          nextExpandedMonths[group.month] = group.month === defaultOpenMonth;
          changed = true;
        }
      });

      return changed ? nextExpandedMonths : currentExpandedMonths;
    });
  }, [groupedTransactions]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((currentExpandedMonths) => ({
      ...currentExpandedMonths,
      [month]: !currentExpandedMonths[month],
    }));
  };

  useEffect(() => {
    const transactionIds = new Set(transactions.map((transaction) => transaction.id));

    setSelectedTransactionIds((currentIds) =>
      currentIds.filter((id) => transactionIds.has(id)),
    );
  }, [transactions]);

  const selectedTransactionIdSet = useMemo(
    () => new Set(selectedTransactionIds),
    [selectedTransactionIds],
  );
  const selectedTransactionCount = transactions.filter((transaction) =>
    selectedTransactionIdSet.has(transaction.id),
  ).length;
  const allTransactionsSelected =
    transactions.length > 0 &&
    transactions.every((transaction) => selectedTransactionIdSet.has(transaction.id));

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds((currentIds) =>
      currentIds.includes(transactionId)
        ? currentIds.filter((id) => id !== transactionId)
        : [...currentIds, transactionId],
    );
  };

  const setAllTransactionsSelected = (checked: boolean) => {
    setSelectedTransactionIds(checked ? transactions.map((transaction) => transaction.id) : []);
  };

  const setMonthTransactionsSelected = (
    monthTransactions: Transaction[],
    checked: boolean,
  ) => {
    const monthTransactionIds = monthTransactions.map((transaction) => transaction.id);

    setSelectedTransactionIds((currentIds) => {
      if (!checked) {
        return currentIds.filter((id) => !monthTransactionIds.includes(id));
      }

      return Array.from(new Set([...currentIds, ...monthTransactionIds]));
    });
  };

  const areMonthTransactionsSelected = (monthTransactions: Transaction[]) => {
    return (
      monthTransactions.length > 0 &&
      monthTransactions.every((transaction) =>
        selectedTransactionIdSet.has(transaction.id),
      )
    );
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
  const transactionColumnWidths = [
    44,
    120,
    80,
    130,
    130,
    110,
    160,
    80,
    undefined,
    130,
  ];
  const sortedAccounts = sortAccountsByPreferredOrder(accounts);

  return (
    <>
      <style jsx>{`
        .transactions-container {
          padding: 20px;
        }

        .transaction-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: box-shadow 0.2s;
        }

        .transaction-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .transaction-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 8px;
        }

        .transaction-card-main {
          flex: 1;
          min-width: 0;
        }

        .transaction-card-amount {
          font-size: 1.1em;
          font-weight: bold;
          white-space: nowrap;
        }

        .transaction-card-amount.income {
          color: #28a745;
        }

        .transaction-card-amount.expense {
          color: #dc3545;
        }

        .transaction-card-info {
          font-size: 0.9em;
          color: #666;
          margin: 4px 0;
        }

        .transaction-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .transaction-card-note {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
          font-size: 0.9em;
          color: #666;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .card-list-view {
          display: none;
        }

        .table-view {
          display: block;
        }

        .transactions-table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .transactions-table {
          width: 100%;
          min-width: 1300px;
          table-layout: fixed;
          border-collapse: collapse;
          border: 1px solid #ccc;
        }

        .transactions-date-cell {
          white-space: nowrap;
        }

        .transactions-note-cell {
          min-width: 0;
          white-space: normal;
          overflow: hidden;
          overflow-wrap: anywhere;
          word-break: break-word;
          cursor: pointer;
        }

        .transactions-note-content {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          line-height: 1.4;
          max-height: 2.8em;
        }

        .transactions-note-content.expanded {
          display: block;
          -webkit-line-clamp: unset;
          max-height: none;
          white-space: pre-wrap;
        }

        .transactions-action-cell {
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .transactions-container {
            padding: 12px;
          }

          .card-list-view {
            display: block;
          }

          .table-view {
            display: none;
          }
        }
      `}</style>
      <div className="transactions-container">
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

      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            checked={allTransactionsSelected}
            onChange={(event) => setAllTransactionsSelected(event.target.checked)}
            type="checkbox"
          />
          {t("全选", lang)}
        </label>
        <span>
          {t("已选", lang)} {selectedTransactionCount} {t("笔", lang)}
        </span>
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
                {sortedAccounts.map((acc) => (
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

      {/* Card list view for mobile (md以下) */}
      <div className="card-list-view">
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
            {t("暂无数据", lang)}
          </div>
        ) : (
          groupedTransactions.map((group) => {
            const isMonthExpanded = expandedMonths[group.month] ?? false;
            const isMonthSelected = areMonthTransactionsSelected(group.transactions);

            return (
              <div key={group.month}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "10px 12px",
                    marginBottom: 8,
                    background: "#f0f0f0",
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    fontWeight: "bold",
                  }}
                >
                  <input
                    checked={isMonthSelected}
                    onChange={(event) =>
                      setMonthTransactionsSelected(
                        group.transactions,
                        event.target.checked,
                      )
                    }
                    type="checkbox"
                  />
                  <button
                    onClick={() => toggleMonth(group.month)}
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                    type="button"
                  >
                    {isMonthExpanded ? "▼" : "▶"} {group.month}（
                    {group.transactions.length}笔）
                  </button>
                </div>

                {isMonthExpanded &&
                  group.transactions.map((t0) => {
                    const account = accounts.find((a) => a.id === t0.account_id);
                    const isExpanded = expandedCardId === t0.id;
                    const hasNote = t0.note && t0.note.trim() !== "";
                    const isSelected = selectedTransactionIdSet.has(t0.id);

                    return (
                      <div
                        key={t0.id}
                        className="transaction-card"
                        onClick={() => hasNote && setExpandedCardId(isExpanded ? null : t0.id)}
                      >
                        <div className="transaction-card-header">
                          <input
                            checked={isSelected}
                            onChange={() => toggleTransactionSelection(t0.id)}
                            onClick={(event) => event.stopPropagation()}
                            type="checkbox"
                          />
                          <div className="transaction-card-main">
                            <div className="transaction-card-info">
                              {t0.date} • {t(t0.type, lang)}
                            </div>
                            <div className="transaction-card-info">
                              {t(t0.category || "", lang)}
                              {t0.subcategory && ` / ${t(t0.subcategory, lang)}`}
                            </div>
                            <div className="transaction-card-info">
                              {account?.name || t0.account_id} • {t0.currency}
                            </div>
                          </div>
                          <div className={`transaction-card-amount ${t0.type === "收入" ? "income" : "expense"}`}>
                            {t0.type === "收入" ? "+" : "-"}{t0.amount}
                          </div>
                        </div>

                        {hasNote && isExpanded && (
                          <div className="transaction-card-note">
                            {t0.note}
                          </div>
                        )}

                        <div className="transaction-card-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(t0);
                            }}
                            style={{
                              backgroundColor: "#ffc107",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              flex: 1
                            }}
                          >
                            {t("编辑", lang)}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(t0.id);
                            }}
                            style={{
                              backgroundColor: "red",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              flex: 1
                            }}
                          >
                            {t("删除", lang)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>

      {/* Table view for desktop (md以上) */}
      <div className="table-view">
        <div className="transactions-table-scroll">
        <table className="transactions-table">
          <colgroup>
            {transactionColumnWidths.map((width, index) => (
              <col key={index} style={width ? { width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>
                <input
                  checked={allTransactionsSelected}
                  onChange={(event) => setAllTransactionsSelected(event.target.checked)}
                  type="checkbox"
                />
              </th>
              {tableHeaders.map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedTransactions.map((group) => {
              const isMonthExpanded = expandedMonths[group.month] ?? false;
              const isMonthSelected = areMonthTransactionsSelected(group.transactions);

              return (
                <Fragment key={group.month}>
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        ...cellStyle,
                        backgroundColor: "#f0f0f0",
                        fontWeight: "bold",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          checked={isMonthSelected}
                          onChange={(event) =>
                            setMonthTransactionsSelected(
                              group.transactions,
                              event.target.checked,
                            )
                          }
                          type="checkbox"
                        />
                        <button
                          onClick={() => toggleMonth(group.month)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                          type="button"
                        >
                          {isMonthExpanded ? "▼" : "▶"} {group.month}（
                          {group.transactions.length}笔）
                        </button>
                      </label>
                    </td>
                  </tr>
                  {isMonthExpanded &&
                    group.transactions.map((t0) => {
                      const account = accounts.find((a) => a.id === t0.account_id);
                      const isSelected = selectedTransactionIdSet.has(t0.id);
                      return (
                        <tr key={t0.id}>
                          <td style={cellStyle}>
                            <input
                              checked={isSelected}
                              onChange={() => toggleTransactionSelection(t0.id)}
                              type="checkbox"
                            />
                          </td>
                          <td className="transactions-date-cell" style={cellStyle}>{t0.date}</td>
                          <td style={cellStyle}>{t(t0.type, lang)}</td>
                          <td style={cellStyle}>{t(t0.category || "", lang)}</td>
                          <td style={cellStyle}>{t(t0.subcategory || "", lang)}</td>
                          <td style={{ ...cellStyle, textAlign: "right" }}>{t0.amount}</td>
                          <td style={cellStyle}>{account?.name || t0.account_id}</td>
                          <td style={cellStyle}>{t0.currency}</td>
                          <td
                            className="transactions-note-cell"
                            onClick={() => setExpandedNoteId(expandedNoteId === t0.id ? null : t0.id)}
                            style={cellStyle}
                            title={t0.note || ""}
                          >
                            <div className={`transactions-note-content ${expandedNoteId === t0.id ? "expanded" : ""}`}>
                              {t0.note}
                            </div>
                          </td>
                          <td className="transactions-action-cell" style={cellStyle}>
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
                </Fragment>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td style={{ ...cellStyle, textAlign: "center" }} colSpan={10}>
                  {t("暂无数据", lang)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    </>
  );
}
