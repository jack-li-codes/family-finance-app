"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import AuthGuard from "@/components/AuthGuard";

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
    console.log("当前用户 ID：", user?.id);
    if (!user?.id) {
      console.warn("未获取到用户信息，跳过 worklog 查询");
      return;
    }
  
    const { data, error } = await supabase
      .from("worklogs")
      .select("*, project:projects(name)") // ✅ 正确别名写法
      .eq("user_id", user.id)
      .order("date", { ascending: false });
  
    console.log("📦 获取到的 worklogs 数据：", data); // 改进日志格式
  
    if (!error && data) {
      const enriched = data.map((w: any) => ({
        ...w,
        project_name: w.project?.name ?? "无项目", // ✅ 显示项目名称
      }));
      setWorklogs(enriched);
    } else {
      console.error("查询失败", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      alert("用户信息获取失败，请重新登录");
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
      await fetchWorklogs(); // 👈 这里才是真正刷新列表的位置
    } else {
      alert("保存失败: " + error.message);
    }
  };

  const handleEdit = (log: WorkLog) => {
    setFormData(log);
    setEditingId(log.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("worklogs").delete().eq("id", id);
    fetchWorklogs();
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
    setShowForm(false); // 只负责重置，不负责刷新
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(worklogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkLogs");
    XLSX.writeFile(wb, `worklogs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // 添加调试日志
  console.log("📋 正在渲染 worklogs：", worklogs);

  return (
    <AuthGuard>
      <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: 1200, margin: "auto" }}>
        <h2>🛠 工程时间记录</h2>
        <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ backgroundColor: "green", color: "white", padding: "8px 16px" }}>＋ 新增记录</button>
          <button onClick={exportToExcel} style={{ backgroundColor: "#007bff", color: "white", padding: "8px 16px" }}>⬇️ 导出为 Excel</button>
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
                      <option value="">请选择项目</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td><input placeholder="地点" name="location" value={formData.location} onChange={handleChange} /></td>
                  <td><textarea placeholder="备注（施工内容）" name="note" value={formData.note} onChange={handleChange} /></td>
                  <td><button onClick={handleSubmit} style={{ backgroundColor: "green", color: "white", padding: "6px 12px" }}>保存</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <h4>📋 已记录项目</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc", display: "table" }}>
          <thead>
            <tr>
              {"日期,出发时间,回家时间,总工时,项目,地点,备注,操作".split(",").map((h) => (
                <th key={h} style={{ border: "1px solid #ccc", padding: "10px 16px", backgroundColor: "#f0f0f0", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worklogs.length === 0 && <tr><td colSpan={8} style={{textAlign: "center", padding: "20px"}}>⚠️ 暂无记录，请先新增</td></tr>}
            {worklogs.map((log) => {
              console.log("渲染单行数据:", log.id, log.start_time, log.project_name, log.location);
              return (
                <tr key={log.id}>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.date || "无日期"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.start_time || "无时间"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.end_time || "无时间"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.hours || 0}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.project_name || "无项目"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.location || "无地点"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>{log.note || "无备注"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleEdit(log)} style={{ backgroundColor: "#ffc107", padding: "4px 8px" }}>编辑</button>
                      <button onClick={() => handleDelete(log.id!)} style={{ backgroundColor: "red", color: "white", padding: "4px 8px" }}>删除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
