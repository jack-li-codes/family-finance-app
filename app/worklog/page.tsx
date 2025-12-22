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
  return new Date(`${ymd}T12:00:00`);
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
    const date = new Date(dateStr);
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
      const logMonth = formatMonthKey(new Date(log.date));
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
        const logMonth = formatMonthKey(new Date(log.date));
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
      <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1200, marginLeft: 0, marginRight: "auto" }}>
        <h2>🛠 {t("工程时间记录", lang)}</h2>

        <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
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
          <div style={{ marginBottom: 24, backgroundColor: "#f9f9f9", padding: 16, border: "1px solid #ccc" }}>
            <table>
              <tbody>
                <tr>
                  <td><input type="date" name="date" value={formData.date} onChange={handleChange} /></td>
                  <td><input type="time" name="start_time" value={formData.start_time ?? ""} onChange={handleChange} /></td>
                  <td><input type="time" name="end_time" value={formData.end_time ?? ""} onChange={handleChange} /></td>
                  <td>
                    <select name="project_id" value={formData.project_id ?? ""} onChange={handleChange}>
                      <option value="">{t("请选择项目", lang)}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td><input placeholder={t("地点", lang)} name="location" value={formData.location ?? ""} onChange={handleChange} /></td>
                  <td><textarea placeholder={t("备注（施工内容）", lang)} name="note" value={formData.note ?? ""} onChange={handleChange} /></td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      name="actual_hours"
                      placeholder={t("实际工时", lang)}
                      value={formData.actual_hours ?? ""}
                      onChange={handleChange}
                      style={{ width: 100 }}
                    />
                  </td>
                  <td>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="checkbox" name="is_holiday" checked={formData.is_holiday || false} onChange={handleChange} />
                      Holiday
                    </label>
                  </td>
                  <td>
                    <button
                      onClick={handleSubmit}
                      style={{ backgroundColor: "green", color: "white", padding: "6px 12px" }}
                    >
                      {t("保存", lang)}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              userSelect: "none"
            }}
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
              <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {[t("日期", lang), t("星期", lang), t("出发时间", lang), t("回家时间", lang), t("总工时", lang), t("实际工时", lang), t("项目", lang), t("地点", lang), t("备注", lang), "Holiday", t("操作", lang)].map((h) => (
                <th key={h} style={{ border: "1px solid #ccc", padding: "10px 16px", backgroundColor: "#f0f0f0", textAlign: "left" }}>{h}</th>
              ))}
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
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.date || t("无日期", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{getWeekday(log.date)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.start_time || t("无时间", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.end_time || t("无时间", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.hours ?? 0}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.actual_hours ?? log.hours ?? 0}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.project_name || t("无项目", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.location || t("无地点", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.note || t("无备注", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.is_holiday ? "✓" : ""}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleEdit(log)}
                      style={{ backgroundColor: "#ffc107", padding: "4px 8px" }}
                    >
                      {t("编辑", lang)}
                    </button>
                    <button
                      onClick={() => handleDelete(log.id!)}
                      style={{ backgroundColor: "red", color: "white", padding: "4px 8px" }}
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
    </AuthGuard>
  );
}
