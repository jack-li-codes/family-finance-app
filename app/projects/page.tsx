"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

interface Project {
  id?: string;
  user_id?: string;
  name: string;
  location: string;
  expected_start_date: string; // YYYY-MM-DD or ""
  expected_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  note: string;
}

// Local YYYY-MM-DD (avoid timezone shift)
const toLocalISODate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ProjectsPage() {
  const { lang } = useLang();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<Omit<Project, "id" | "user_id">>({
    name: "",
    location: "",
    expected_start_date: "", // set in resetForm()
    expected_end_date: "",   // blank by default
    actual_start_date: "",   // set in resetForm()
    actual_end_date: "",     // blank by default
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // New form: Start = today; End = blank
  const resetForm = () => {
    const today = toLocalISODate(new Date());
    setFormData({
      name: "",
      location: "",
      expected_start_date: today,
      expected_end_date: "",
      actual_start_date: today,
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
      alert(t("保存失败：", lang) + error.message);
    } else {
      setShowForm(false);
      resetForm();
      fetchProjects();
    }
  };

  const handleEdit = (project: Project) => {
    const { id, user_id, ...rest } = project;
    setFormData({
      ...rest,
      expected_start_date: rest.expected_start_date || "",
      expected_end_date: rest.expected_end_date || "",
      actual_start_date: rest.actual_start_date || "",
      actual_end_date: rest.actual_end_date || "",
    });
    setEditingId(project.id!);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("确定要删除这个项目吗？", lang))) return;
    await supabase.from("projects").delete().eq("id", id);
    fetchProjects();
  };

  const headers = [
    "名称",
    "地点",
    "预计开始",
    "预计结束",
    "实际开始",
    "实际结束",
    "备注",
    "操作",
  ];

  return (
    <AuthGuard>
      <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1200, margin: "auto" }}>
        <h3>🗂 {t("项目管理", lang)}</h3>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{ backgroundColor: "green", color: "white", padding: "6px 12px", marginBottom: 12 }}
          aria-label={t("新建项目", lang)}
          title={t("新建项目", lang)}
        >
          ＋ {t("新建项目", lang)}
        </button>

        {showForm && (
          <table style={{ width: "100%", marginBottom: 24, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={`form-${h}`}
                    style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}
                  >
                    {t(h, lang)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("名称", lang)}
                  />
                </td>
                <td>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder={t("地点", lang)}
                  />
                </td>

                {/* Starts: default today; Ends: default blank. All in English locale */}
                <td>
                  <input
                    type="date"
                    name="expected_start_date"
                    lang="en-CA"
                    value={formData.expected_start_date || toLocalISODate(new Date())}
                    onChange={handleChange}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="expected_end_date"
                    lang="en-CA"
                    placeholder="YYYY-MM-DD"
                    value={formData.expected_end_date || ""}
                    onChange={handleChange}
                    min={formData.expected_start_date || undefined}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="actual_start_date"
                    lang="en-CA"
                    value={formData.actual_start_date || toLocalISODate(new Date())}
                    onChange={handleChange}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    name="actual_end_date"
                    lang="en-CA"
                    placeholder="YYYY-MM-DD"
                    value={formData.actual_end_date || ""}
                    onChange={handleChange}
                    min={formData.actual_start_date || undefined}
                  />
                </td>

                <td>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    placeholder={t("备注", lang)}
                  />
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
        )}

        <h4>📁 {t("所有项目", lang)}</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={`list-${h}`}
                  style={{ border: "1px solid #ccc", padding: 8, backgroundColor: "#f0f0f0" }}
                >
                  {t(h, lang)}
                </th>
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
                    <button
                      onClick={() => handleEdit(p)}
                      style={{ backgroundColor: "#ffc107", padding: "4px 8px" }}
                    >
                      {t("编辑", lang)}
                    </button>
                    <button
                      onClick={() => handleDelete(p.id!)}
                      style={{ backgroundColor: "red", color: "white", padding: "4px 8px" }}
                    >
                      {t("删除", lang)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: "center", padding: 16 }}>
                  {t("暂无数据。", lang)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AuthGuard>
  );
}
