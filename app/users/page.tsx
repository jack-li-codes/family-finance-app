"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";

interface User {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
}

const ADMIN_EMAIL = "lucy.jinhui@gmail.com";

export default function UsersPage() {
  const { lang } = useLang();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
      fetchUsers();
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        alert(`${t("❌ 操作失败：", lang)}${data.error}`);
      }
    } catch (error: any) {
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert(t("Email 和密码不能为空", lang));
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(t("✅ 用户创建成功", lang));
        setShowAddForm(false);
        setNewUserEmail("");
        setNewUserPassword("");
        fetchUsers();
      } else {
        alert(`${t("❌ 操作失败：", lang)}${data.error}`);
      }
    } catch (error: any) {
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId || !resetPassword) {
      alert(t("请选择用户并输入新密码", lang));
      return;
    }

    if (!confirm(t("确定要重置该用户的密码吗？", lang))) return;

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword: resetPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(t("✅ 密码重置成功", lang));
        setShowResetForm(false);
        setSelectedUserId("");
        setResetPassword("");
      } else {
        alert(`${t("❌ 操作失败：", lang)}${data.error}`);
      }
    } catch (error: any) {
      alert(`${t("❌ 操作失败：", lang)}${error.message}`);
    }
  };

  const cellStyle = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    textAlign: "left" as const,
  };

  const thStyle = {
    ...cellStyle,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        {t("加载中...", lang)}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>{t("❌ 权限不足", lang)}</h2>
        <p>{t("只有管理员可以访问此页面", lang)}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👥 {t("用户管理", lang)}</h2>

      <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            backgroundColor: "green",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ＋ {t("新增用户", lang)}
        </button>

        <button
          onClick={() => setShowResetForm(!showResetForm)}
          style={{
            backgroundColor: "#ff9800",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔑 {t("重置密码", lang)}
        </button>
      </div>

      {showAddForm && (
        <div
          style={{
            padding: 16,
            border: "1px solid #ccc",
            marginBottom: 20,
            background: "#f9f9f9",
            borderRadius: "4px",
          }}
        >
          <h3>{t("新增用户", lang)}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label>
              Email
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                style={{ width: "100%", padding: "6px", marginTop: 4 }}
              />
            </label>

            <label>
              {t("密码", lang)}
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                style={{ width: "100%", padding: "6px", marginTop: 4 }}
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleAddUser}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("保存", lang)}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUserEmail("");
                  setNewUserPassword("");
                }}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("取消", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetForm && (
        <div
          style={{
            padding: 16,
            border: "1px solid #ccc",
            marginBottom: 20,
            background: "#fff8e1",
            borderRadius: "4px",
          }}
        >
          <h3>{t("重置密码", lang)}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label>
              {t("选择用户", lang)}
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ width: "100%", padding: "6px", marginTop: 4 }}
              >
                <option value="">{t("请选择", lang)}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t("新密码", lang)}
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                style={{ width: "100%", padding: "6px", marginTop: 4 }}
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleResetPassword}
                style={{
                  backgroundColor: "#ff9800",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("确认重置", lang)}
              </button>
              <button
                onClick={() => {
                  setShowResetForm(false);
                  setSelectedUserId("");
                  setResetPassword("");
                }}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  background: "#fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {t("取消", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #ccc",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>{t("用户ID", lang)}</th>
            <th style={thStyle}>{t("创建时间", lang)}</th>
            <th style={thStyle}>{t("最后登录", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td style={{ ...cellStyle, textAlign: "center" }} colSpan={4}>
                {t("暂无数据", lang)}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td style={cellStyle}>{user.email}</td>
                <td style={cellStyle}>{user.id}</td>
                <td style={cellStyle}>
                  {new Date(user.created_at).toLocaleString()}
                </td>
                <td style={cellStyle}>
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
