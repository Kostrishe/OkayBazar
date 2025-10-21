// client/src/services/account.js
import { apiFetch } from "../lib/api";

// Профиль
export const getProfile = () => apiFetch("/auth/me"); // уже есть
export const updateProfile = (payload) =>
  apiFetch("/users/me", { method: "PUT", body: payload }); // НУЖНО добавить на бэке

// Смена пароля
export const changePassword = ({ currentPassword, newPassword }) =>
  apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });

// Мои заказы
export const fetchMyOrders = () => apiFetch("/orders/my");