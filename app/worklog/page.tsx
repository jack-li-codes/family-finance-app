"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import AuthGuard from "@/components/AuthGuard";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

interface WorkLog {
  id?: string;
  user_id?: string;
  project_id?: string | null;
  project_name?: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  hours?: number | null;
  actual_hours?: number | null;
  location?: string | null;
  note?: string | null;
  is_holiday?: boolean;
}

// 日期工具函数
function toLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnlyLocal(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekRange(date: Date | string): { start: string; end: string } {
  const d = typeof date === 'string' ? parseDateOnlyLocal(date) : new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 周一作为一周的开始
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: toLocalYMD(monday), end: toLocalYMD(sunday) };
}

function formatWeekLabel(start: string, end: string): string {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startDate = parseDateOnlyLocal(start);
  const endDate = parseDateOnlyLocal(end);
  return `${start} (${weekdays[startDate.getDay()]}) ~ ${end} (${weekdays[endDate.getDay()]})`;
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function WorklogPage() {
  const { lang } = useLang();
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<WorkLog>({
    date: toLocalYMD(new Date()),
    start_time: "",
    end_time: "",
    hours: 0,
    actual_hours: null,
    location: "",
    note: "",
    project_id: null,
    is_holiday: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterOnlyHoliday, setFilterOnlyHoliday] = useState(false);
  const [filterExcludeHoliday, setFilterExcludeHoliday] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [actualHoursTouched, setActualHoursTouched] = useState(false);

  const getWeekday = (dateStr: string) => {
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const date = parseDateOnlyLocal(dateStr);
    return weekdays[date.getDay()];
  };

  useEffect(() => {
    fetchProjects();
    fetchWorklogs();
  }, []);

  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`1970-01-01T${formData.start_time}`);
      const end = new Date(`1970-01-01T${formData.end_time}`);
      const diff = (end.getTime() - start.getTime()) / 3600000;
      const rounded = Math.round(diff * 100) / 100;

      setFormData((prev) => {
        const next: any = { ...prev, hours: rounded };

        // 如果用户没手动动过 actual_hours，就让它默认跟着 hours
        if (!actualHoursTouched && (prev.actual_hours == null || prev.actual_hours === prev.hours)) {
          next.actual_hours = rounded;
        }
        return next;
      });
    }
  }, [formData.start_time, formData.end_time, actualHoursTouched]);

  // 统计计算逻辑
  const statistics = useMemo(() => {
    // 根据Holiday过滤选项过滤worklogs
    let filteredLogs = worklogs;
    if (filterOnlyHoliday) {
      filteredLogs = worklogs.filter(log => log.is_holiday === true);
    } else if (filterExcludeHoliday) {
      filteredLogs = worklogs.filter(log => log.is_holiday !== true);
    }

    const now = new Date();
    const currentWeekRange = getWeekRange(now);
    const currentMonth = formatMonthKey(now);

    // 本周统计
    const thisWeekLogs = filteredLogs.filter(log => {
      return log.date >= currentWeekRange.start && log.date <= currentWeekRange.end;
    });
    const thisWeekHours = thisWeekLogs.reduce((sum, log) => {
      const h = Number(log.actual_hours ?? log.hours ?? 0) || 0;
      return sum + h;
    }, 0);
    const thisWeekCount = thisWeekLogs.length;

    // 本月统计
    const thisMonthLogs = filteredLogs.filter(log => {
      const logMonth = formatMonthKey(parseDateOnlyLocal(log.date));
      return logMonth === currentMonth;
    });
    const thisMonthHours = thisMonthLogs.reduce((sum, log) => {
      const h = Number(log.actual_hours ?? log.hours ?? 0) || 0;
      return sum + h;
    }, 0);
    const thisMonthCount = thisMonthLogs.length;

    // 最近8周统计
    const last8Weeks: { period: string; hours: number; count: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const weekDate = new Date(now);
      weekDate.setDate(now.getDate() - i * 7);
      const weekRange = getWeekRange(weekDate);
      const weekLogs = filteredLogs.filter(log => {
        return log.date >= weekRange.start && log.date <= weekRange.end;
      });
      const weekHours = weekLogs.reduce((sum, log) => {
        const h = Number(log.actual_hours ?? log.hours ?? 0) || 0;
        return sum + h;
      }, 0);
      last8Weeks.push({
        period: formatWeekLabel(weekRange.start, weekRange.end),
        hours: Math.round(weekHours * 100) / 100,
        count: weekLogs.length
      });
    }

    // 最近12个月统计
    const last12Months: { period: string; hours: number; count: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = formatMonthKey(monthDate);
      const monthLogs = filteredLogs.filter(log => {
        const logMonth = formatMonthKey(parseDateOnlyLocal(log.date));
        return logMonth === monthKey;
      });
      const monthHours = monthLogs.reduce((sum, log) => {
        const h = Number(log.actual_hours ?? log.hours ?? 0) || 0;
        return sum + h;
      }, 0);
      last12Months.push({
        period: monthKey,
        hours: Math.round(monthHours * 100) / 100,
        count: monthLogs.length
      });
    }

    return {
      thisWeekHours: Math.round(thisWeekHours * 100) / 100,
      thisWeekCount,
      thisMonthHours: Math.round(thisMonthHours * 100) / 100,
      thisMonthCount,
      last8Weeks,
      last12Months
    };
  }, [worklogs, filterOnlyHoliday, filterExcludeHoliday]);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data } = await supabase.from("projects").select("id, name").eq("user_id", user.id);
    if (data) setProjects(data);
  };

  const fetchWorklogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("worklogs")
      .select("*, project:projects(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!error && data) {
      const enriched = data.map((w: any) => ({
        ...w,
        project_name: w.project?.name ?? t("无项目", lang),
      }));
      setWorklogs(enriched);
    } else {
      alert(t("加载失败：", lang) + (error?.message || ""));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;

    // checkbox
    if (target.type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    // 实际工时：手动输入后不再被自动计算覆盖
    if (name === "actual_hours") {
      const raw = target.value;
      const num = raw === "" ? null : Number(raw);
      setActualHoursTouched(true);
      setFormData((prev) => ({ ...prev, actual_hours: Number.isFinite(num as any) ? (num as any) : null }));
      return;
    }

    const value = target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      alert(t("用户信息获取失败，请重新登录", lang));
      return;
    }

    const payload = {
      date: formData.date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      hours: formData.hours || null,
      actual_hours: formData.actual_hours ?? null,
      location: formData.location || null,
      note: formData.note || null,
      project_id: formData.project_id || null,
      is_holiday: formData.is_holiday || false,
      user_id: user.id,
    };

    const { error } = editingId
      ? await supabase.from("worklogs").update(payload).eq("id", editingId)
      : await supabase.from("worklogs").insert(payload);

    if (!error) {
      resetForm();
      await fetchWorklogs();
    } else {
      alert(t("保存失败：", lang) + error.message);
    }
  };

  const handleEdit = (log: WorkLog) => {
    setFormData(log);
    setEditingId(log.id!);
    setShowForm(true);
    setActualHoursTouched(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("确定要删除这条记录吗？", lang))) return;
    const { error } = await supabase.from("worklogs").delete().eq("id", id);
    if (!error) fetchWorklogs();
    else alert(t("删除失败：", lang) + error.message);
  };

  const resetForm = () => {
    setFormData({
      date: toLocalYMD(new Date()),
      start_time: "",
      end_time: "",
      hours: 0,
      actual_hours: null,
      location: "",
      note: "",
      project_id: null,
      is_holiday: false,
    });
    setEditingId(null);
    setShowForm(false);
    setActualHoursTouched(false);
  };

  const exportToExcel = () => {
    const data = worklogs.map((w) => ({
      [t("日期", lang)]: w.date,
      [t("星期", lang)]: getWeekday(w.date),
      [t("出发时间", lang)]: w.start_time,
      [t("回家时间", lang)]: w.end_time,
      [t("总工时", lang)]: w.hours,
      [t("实际工时", lang)]: w.actual_hours ?? w.hours,
      [t("项目", lang)]: w.project_name,
      [t("地点", lang)]: w.location,
      [t("备注", lang)]: w.note,
      "Holiday": w.is_holiday ? "✓" : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("工程时间记录", lang));
    XLSX.writeFile(wb, `${t("工程时间记录", lang)}_${toLocalYMD(new Date())}.xlsx`);
  };

  return (
    <AuthGuard>
      <style jsx>{`
        .worklog-container {
          padding: 20px;
          font-family: sans-serif;
          max-width: 1200px;
          margin-left: 0;
          margin-right: auto;
        }

        .form-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .form-field {
          flex: 1;
          min-width: 110px;
          display: flex;
          flex-direction: column;
        }

        .form-field label {
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 2px;
          display: none;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          width: 100%;
          box-sizing: border-box;
        }

        .form-field-note {
          flex: 100%;
        }

        .form-field-button {
          flex: 100%;
          min-width: auto;
        }

        .stats-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stats-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .worklog-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ccc;
          min-width: 800px;
        }

        .worklog-table th,
        .worklog-table td {
          border: 1px solid #ccc;
          padding: 10px 16px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-buttons button {
          padding: 4px 8px;
        }

        @media (max-width: 640px) {
          .worklog-container {
            padding: 12px;
          }

          .form-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .form-field {
            flex: 1 1 140px;
            min-width: 120px;
          }

          .form-field label {
            display: block;
          }

          /* 第一行：日期 + 项目 + 地点 */
          .form-field-date {
            flex: 1 1 140px;
            min-width: 120px;
          }

          .form-field-project {
            flex: 1 1 140px;
            min-width: 120px;
          }

          .form-field-location {
            flex: 1 1 140px;
            min-width: 120px;
          }

          /* 第二行：出发 + 回家 + 实际工时 + Holiday */
          .form-field-time {
            flex: 1 1 110px;
            min-width: 110px;
          }

          .form-field-actual-hours {
            flex: 1 1 100px;
            min-width: 100px;
          }

          .form-field-holiday {
            flex: 0 0 80px;
            min-width: 80px;
          }

          /* 备注和保存按钮独占一行 */
          .form-field-note {
            flex: 100%;
            width: 100%;
          }

          .form-field-button {
            flex: 100%;
            width: 100%;
          }

          .form-field-button button {
            min-width: 80px;
          }

          .stats-summary {
            font-size: 0.9rem;
          }

          .stats-grid-2col {
            grid-template-columns: 1fr;
          }

          .worklog-table th,
          .worklog-table td {
            padding: 6px 8px;
            font-size: 0.85rem;
          }

          .worklog-table .col-location,
          .worklog-table .col-note {
            display: none;
          }

          .action-buttons button {
            padding: 3px 6px;
            font-size: 0.8rem;
          }
        }
      `}</style>
      <div className="worklog-container">
        <h2>🛠 {t("工程时间记录", lang)}</h2>

        <div style={{ marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{ backgroundColor: "green", color: "white", padding: "8px 16px" }}
          >
            ＋ {t("新增记录", lang)}
          </button>
          <button
            onClick={exportToExcel}
            style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px" }}
          >
            ⬇️ {t("导出为Excel", lang)}
          </button>
        </div>

        {showForm && (
          <div style={{ marginBottom: 24, backgroundColor: "#f9f9f9", padding: 16, border: "1px solid #ccc", borderRadius: 4 }}>
            <div className="form-grid">
              {/* 第一行：日期 + 项目 + 地点 */}
              <div className="form-field form-field-date">
                <label>{t("日期", lang)}</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>
              <div className="form-field form-field-project">
                <label>{t("项目", lang)}</label>
                <select name="project_id" value={formData.project_id ?? ""} onChange={handleChange}>
                  <option value="">{t("请选择项目", lang)}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field form-field-location">
                <label>{t("地点", lang)}</label>
                <input placeholder={t("地点", lang)} name="location" value={formData.location ?? ""} onChange={handleChange} />
              </div>

              {/* 第二行：出发 + 回家 + 实际工时 + Holiday */}
              <div className="form-field form-field-time">
                <label>出发</label>
                <input type="time" name="start_time" value={formData.start_time ?? ""} onChange={handleChange} style={{ minWidth: 110 }} />
              </div>
              <div className="form-field form-field-time">
                <label>回家</label>
                <input type="time" name="end_time" value={formData.end_time ?? ""} onChange={handleChange} style={{ minWidth: 110 }} />
              </div>
              <div className="form-field form-field-actual-hours">
                <label>实际工时</label>
                <input
                  type="number"
                  step="0.01"
                  name="actual_hours"
                  placeholder="实际工时"
                  value={formData.actual_hours ?? ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field form-field-holiday">
                <label>Holiday</label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <input type="checkbox" name="is_holiday" checked={formData.is_holiday || false} onChange={handleChange} />
                  Holiday
                </label>
              </div>

              {/* 备注独占一行 */}
              <div className="form-field form-field-note">
                <label>{t("备注（施工内容）", lang)}</label>
                <textarea placeholder={t("备注（施工内容）", lang)} name="note" value={formData.note ?? ""} onChange={handleChange} rows={2} />
              </div>

              {/* 保存按钮独占一行 */}
              <div className="form-field form-field-button">
                <button
                  onClick={handleSubmit}
                  style={{ backgroundColor: "green", color: "white", padding: "8px 16px", width: "100%" }}
                >
                  {t("保存", lang)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 统计区域 */}
        <div style={{ marginBottom: 24, backgroundColor: "#f0f8ff", border: "1px solid #b0d4f1", borderRadius: 4 }}>
          {/* 可点击的标题栏 */}
          <div
            onClick={() => setStatsOpen(!statsOpen)}
            style={{
              padding: 16,
              cursor: "pointer",
              userSelect: "none"
            }}
            className="stats-summary"
          >
            <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>
              📊 统计 {statsOpen ? "▾" : "▸"}
            </div>
            <div style={{ color: "#666", fontSize: "0.95em" }}>
              本周: <strong>{statistics.thisWeekHours}</strong> 小时 / 本月: <strong>{statistics.thisMonthHours}</strong> 小时
            </div>
          </div>

          {/* 折叠内容 */}
          {statsOpen && (
            <div style={{ padding: "0 16px 16px 16px" }}>
              {/* Holiday过滤选项 */}
              <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterOnlyHoliday}
                    onChange={(e) => {
                      setFilterOnlyHoliday(e.target.checked);
                      if (e.target.checked) setFilterExcludeHoliday(false);
                    }}
                  />
                  仅统计 Holiday
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filterExcludeHoliday}
                    onChange={(e) => {
                      setFilterExcludeHoliday(e.target.checked);
                      if (e.target.checked) setFilterOnlyHoliday(false);
                    }}
                  />
                  排除 Holiday
                </label>
              </div>

              {/* 本周和本月统计 */}
              <div className="stats-grid-2col" style={{ marginBottom: 16 }}>
                <div style={{ backgroundColor: "white", padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>本周</div>
                  <div>合计工时: <strong>{statistics.thisWeekHours}</strong> 小时</div>
                  <div>记录条数: <strong>{statistics.thisWeekCount}</strong> 条</div>
                </div>
                <div style={{ backgroundColor: "white", padding: 12, border: "1px solid #ddd", borderRadius: 4 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>本月</div>
                  <div>合计工时: <strong>{statistics.thisMonthHours}</strong> 小时</div>
                  <div>记录条数: <strong>{statistics.thisMonthCount}</strong> 条</div>
                </div>
              </div>

              {/* 最近8周和最近12个月统计 */}
              <div className="stats-grid-2col">
                {/* 最近8周 */}
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>最近 8 周</div>
                  <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                      <thead style={{ position: "sticky", top: 0, backgroundColor: "#f5f5f5" }}>
                        <tr>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "left" }}>Period</th>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>Hours</th>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.last8Weeks.map((week, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9" }}>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px", fontSize: "0.85em" }}>{week.period}</td>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>{week.hours}</td>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>{week.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 最近12个月 */}
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: 8 }}>最近 12 个月</div>
                  <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #ddd", borderRadius: 4 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                      <thead style={{ position: "sticky", top: 0, backgroundColor: "#f5f5f5" }}>
                        <tr>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "left" }}>Period</th>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>Hours</th>
                          <th style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.last12Months.map((month, index) => (
                          <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "white" : "#f9f9f9" }}>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px" }}>{month.period}</td>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>{month.hours}</td>
                            <td style={{ border: "1px solid #ddd", padding: "6px 8px", textAlign: "right" }}>{month.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <h4>📋 {t("已记录项目", lang)}</h4>
        <div className="table-container">
          <table className="worklog-table">
            <thead>
              <tr>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("日期", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("星期", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("出发时间", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("回家时间", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("总工时", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("实际工时", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("项目", lang)}</th>
                <th className="col-location" style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("地点", lang)}</th>
                <th className="col-note" style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("备注", lang)}</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>Holiday</th>
                <th style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>{t("操作", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {worklogs.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: 20 }}>
                    ⚠️ {t("暂无记录，请先新增", lang)}
                  </td>
                </tr>
              )}
              {worklogs.map((log) => (
                <tr key={log.id} style={{ backgroundColor: log.is_holiday ? "#fff3cd" : "transparent" }}>
                  <td>{log.date || t("无日期", lang)}</td>
                  <td>{getWeekday(log.date)}</td>
                  <td>{log.start_time || t("无时间", lang)}</td>
                  <td>{log.end_time || t("无时间", lang)}</td>
                  <td>{log.hours ?? 0}</td>
                  <td>{log.actual_hours ?? log.hours ?? 0}</td>
                  <td>{log.project_name || t("无项目", lang)}</td>
                  <td className="col-location">{log.location || t("无地点", lang)}</td>
                  <td className="col-note">{log.note || t("无备注", lang)}</td>
                  <td>{log.is_holiday ? "✓" : ""}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(log)}
                        style={{ backgroundColor: "#ffc107" }}
                      >
                        {t("编辑", lang)}
                      </button>
                      <button
                        onClick={() => handleDelete(log.id!)}
                        style={{ backgroundColor: "red", color: "white" }}
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
