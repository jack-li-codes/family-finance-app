"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

interface Project {
  id?: string;
  user_id?: string;
  name: string;
  location: string;
  expected_start_date: string;
  expected_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  note: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<Omit<Project, "id" | "user_id">>({
    name: "",
    location: "",
    expected_start_date: "",
    expected_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    note: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setProjects(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      expected_start_date: "",
      expected_end_date: "",
      actual_start_date: "",
      actual_end_date: "",
      note: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      ...formData,
      user_id: user.id,
      expected_start_date: formData.expected_start_date || null,
      expected_end_date: formData.expected_end_date || null,
      actual_start_date: formData.actual_start_date || null,
      actual_end_date: formData.actual_end_date || null,
    };

    const { error } = editingId
      ? await supabase.from("projects").update(payload).eq("id", editingId)
      : await supabase.from("projects").insert(payload);

    if (error) {
      alert("保存失败: " + error.message);
    } else {
      resetForm();
      fetchProjects();
    }
  };

  const handleEdit = (project: Project) => {
    setFormData(project);
    setEditingId(project.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    fetchProjects();
  };

  return (
    <AuthGuard>
      <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1200, margin: "auto" }}>
        <h3>🗂 项目管理</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{ backgroundColor: "green", color: "white", padding: "6px 12px", marginBottom: 12 }}>＋ 新建项目</button>

        {showForm && (
          <table style={{ width: "100%", marginBottom: 24, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["名称", "地点", "预计开始", "预计结束", "实际开始", "实际结束", "备注", "操作"].map((h) => (
                  <th key={h} style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><input name="name" value={formData.name} onChange={handleChange} /></td>
                <td><input name="location" value={formData.location} onChange={handleChange} /></td>
                <td><input type="date" name="expected_start_date" value={formData.expected_start_date} onChange={handleChange} /></td>
                <td><input type="date" name="expected_end_date" value={formData.expected_end_date} onChange={handleChange} /></td>
                <td><input type="date" name="actual_start_date" value={formData.actual_start_date} onChange={handleChange} /></td>
                <td><input type="date" name="actual_end_date" value={formData.actual_end_date} onChange={handleChange} /></td>
                <td><textarea name="note" value={formData.note} onChange={handleChange} /></td>
                <td><button onClick={handleSubmit} style={{ backgroundColor: "green", color: "white", padding: "6px 12px" }}>保存</button></td>
              </tr>
            </tbody>
          </table>
        )}

        <h4>📁 所有项目</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {["名称", "地点", "预计开始", "预计结束", "实际开始", "实际结束", "备注", "操作"].map((h) => (
                <th key={h} style={{ border: "1px solid #ccc", padding: 8, backgroundColor: "#f0f0f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.name}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.location}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.expected_start_date}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.expected_end_date}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.actual_start_date}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.actual_end_date}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.note}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(p)} style={{ backgroundColor: "#ffc107", padding: "4px 8px" }}>编辑</button>
                    <button onClick={() => handleDelete(p.id!)} style={{ backgroundColor: "red", color: "white", padding: "4px 8px" }}>删除</button>
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
