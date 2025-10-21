import { apiFetch } from "../lib/api";

export const register = (data) => apiFetch("/auth/register", { method: "POST", body: data });
export const login    = (data) => apiFetch("/auth/login",    { method: "POST", body: data });
export const me       = ()     => apiFetch("/auth/me");     
export const logout   = async () => {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    // если где-то сохраняли токен в localStorage — подчистим
    try { localStorage.removeItem("token"); } catch { /* empty */ }
  }
};