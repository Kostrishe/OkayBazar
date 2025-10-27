import { useContext } from "react";
import { AuthContext } from "./auth-context";

/**
 * Хук для доступа к контексту авторизации.
 * Возвращает { user, ready, status, login, register, logout }.
 */
export function useAuth() {
  return useContext(AuthContext);
}