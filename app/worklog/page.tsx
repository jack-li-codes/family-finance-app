"use client";

import { useEffect, useState } from "react";
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
  start_time: string;
  end_time: string;
  hours: number;
  location: string;
  note: string;
}

export default function WorklogPage() {
  const { lang } = useLang();
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<WorkLog>({
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    hours: 0,
    location: "",
    note: "",
    project_id: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchWorklogs();
  }, []);

  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`1970-01-01T${formData.start_time}`);
      const end = new Date(`1970-01-01T${formData.end_time}`);
      const diff = (end.getTime() - start.getTime()) / 3600000;
      setFormData((prev) => ({ ...prev, hours: Math.round(diff * 100) / 100 }));
    }
  }, [formData.start_time, formData.end_time]);

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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      alert(t("用户信息获取失败，请重新登录", lang));
      return;
    }

    const payload = {
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      hours: formData.hours,
      location: formData.location,
      note: formData.note,
      project_id: formData.project_id || null,
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("确定要删除这条记录吗？", lang))) return;
    const { error } = await supabase.from("worklogs").delete().eq("id", id);
    if (!error) fetchWorklogs();
    else alert(t("删除失败：", lang) + error.message);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      hours: 0,
      location: "",
      note: "",
      project_id: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const exportToExcel = () => {
    const data = worklogs.map((w) => ({
      [t("日期", lang)]: w.date,
      [t("出发时间", lang)]: w.start_time,
      [t("回家时间", lang)]: w.end_time,
      [t("总工时", lang)]: w.hours,
      [t("项目", lang)]: w.project_name,
      [t("地点", lang)]: w.location,
      [t("备注", lang)]: w.note,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("工程时间记录", lang));
    XLSX.writeFile(wb, `${t("工程时间记录", lang)}_${new Date().toISOString().split("T")[0]}.xlsx`);
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
                  <td><input type="time" name="start_time" value={formData.start_time} onChange={handleChange} /></td>
                  <td><input type="time" name="end_time" value={formData.end_time} onChange={handleChange} /></td>
                  <td>
                    <select name="project_id" value={formData.project_id ?? ""} onChange={handleChange}>
                      <option value="">{t("请选择项目", lang)}</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td><input placeholder={t("地点", lang)} name="location" value={formData.location} onChange={handleChange} /></td>
                  <td><textarea placeholder={t("备注（施工内容）", lang)} name="note" value={formData.note} onChange={handleChange} /></td>
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

        <h4>📋 {t("已记录项目", lang)}</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {[t("日期", lang), t("出发时间", lang), t("回家时间", lang), t("总工时", lang), t("项目", lang), t("地点", lang), t("备注", lang), t("操作", lang)].map((h) => (
                <th key={h} style={{ border: "1px solid #ccc", padding: "10px 16px", backgroundColor: "#f0f0f0", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worklogs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                  ⚠️ {t("暂无记录，请先新增", lang)}
                </td>
              </tr>
            )}
            {worklogs.map((log) => (
              <tr key={log.id}>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.date || t("无日期", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.start_time || t("无时间", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.end_time || t("无时间", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.hours || 0}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.project_name || t("无项目", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.location || t("无地点", lang)}</td>
                <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.note || t("无备注", lang)}</td>
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
