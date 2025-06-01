# Supabase Schema (for Cursor understanding)

## Table: projects
- id (uuid, primary key)
- name (text)

## Table: worklogs
- id (uuid, primary key)
- user_id (uuid)
- project_id (uuid, foreign key → projects.id)
- date (date)
- start_time (time)
- end_time (time)
- hours (float)
- location (text)
- note (text)
- created_at (timestamp)  ← ✅ 推荐加上，如果数据库中已有
