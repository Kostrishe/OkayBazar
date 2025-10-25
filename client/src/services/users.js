// src/services/users.js
const API = import.meta.env?.VITE_API_URL || "/api";

function authHeaders() {
  try {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

async function request(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers || {}),
    },
    credentials: "include",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/** Получить всех пользователей */
export async function fetchUsers() {
  const data = await request(`${API}/users`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/** Обновить пользователя (меняем только роль) */
export async function updateUserRole(id, role) {
  return request(`${API}/users/${id}`, {
    method: "PUT",
    body: { role },
  });
}

/** Получить одного пользователя */
export async function fetchUser(id) {
  return request(`${API}/users/${id}`);
}

/** СОЗДАТЬ пользователя (email, full_name, password, role) */
export async function createUser({ email, full_name, password, role }) {
  return request(`${API}/users`, {
    method: "POST",
    body: { email, full_name, password, role },
  });
}

/** УДАЛИТЬ пользователя */
export async function deleteUser(id) {
  return request(`${API}/users/${id}`, { method: "DELETE" });
}
