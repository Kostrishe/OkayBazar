import { apiFetch } from "../lib/api";

/**
 * Получить профиль текущего пользователя
 */
export const getProfile = () => apiFetch("/auth/me");

/**
 * Обновить профиль текущего пользователя
 */
export const updateProfile = (payload) =>
  apiFetch("/auth/profile", { method: "PUT", body: payload });

/**
 * Сменить пароль текущего пользователя
 * @param {object} params - Параметры смены пароля
 * @param {string} params.currentPassword - Текущий пароль
 * @param {string} params.newPassword - Новый пароль
 */
export const changePassword = ({ currentPassword, newPassword }) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });

/**
 * Получить список заказов текущего пользователя
 */
export const fetchMyOrders = () => apiFetch("/orders/my");