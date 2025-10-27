import { apiFetch } from "../lib/api";

/**
 * Регистрация нового пользователя.
 * @param {object} data - Данные пользователя (full_name, email, password)
 */
export const register = (data) =>
  apiFetch("/auth/register", { method: "POST", body: data });

/**
 * Вход в систему.
 * @param {object} data - Данные для входа (email, password)
 */
export const login = (data) =>
  apiFetch("/auth/login", { method: "POST", body: data });

/**
 * Получить информацию о текущем пользователе.
 */
export const me = () => apiFetch("/auth/me");

/**
 * Выход из системы.
 * Вызывает эндпоинт logout и очищает токен из localStorage.
 */
export const logout = async () => {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    // если где-то сохраняли токен в localStorage — подчистим
    try {
      localStorage.removeItem("token");
    } catch {
      // игнорируем ошибки доступа к localStorage
    }
  }
};