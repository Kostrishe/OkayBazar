import React, { useEffect, useMemo, useReducer } from "react";
import { AuthContext } from "./auth-context";
import { apiFetch, onUnauthorized } from "../lib/api";
import { authReducer, initialAuthState, Action } from "./auth-reducer";

export default function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // подписываемся на событие "401" от API — если токен протух, разлогиним
  useEffect(() => onUnauthorized(() => dispatch({ type: Action.LOGOUT })), []);

  // при монтировании проверяем, залогинен ли юзер
  useEffect(() => {
    let cancelled = false;

    (async () => {
      dispatch({ type: Action.START_CHECK });
      try {
        const me = await apiFetch("/auth/me");
        if (!cancelled) dispatch({ type: Action.SET_USER, user: me });
      } catch {
        // если 401 или другая ошибка — значит не залогинен
        if (!cancelled) dispatch({ type: Action.SET_ANON });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Логин: отправляем email/password, получаем юзера.
   */
  async function login(email, password) {
    const r = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    // если в ответе уже есть user — берём его, иначе запросим /auth/me
    const me = r?.user ?? (await apiFetch("/auth/me").catch(() => null));
    dispatch({ type: Action.SET_USER, user: me });
    return me;
  }

  /**
   * Регистрация: отправляем full_name, email, password.
   */
  async function register(full_name, email, password) {
    const r = await apiFetch("/auth/register", {
      method: "POST",
      body: { full_name, email, password },
    });
    const me = r?.user ?? (await apiFetch("/auth/me").catch(() => null));
    dispatch({ type: Action.SET_USER, user: me });
    return me;
  }

  /**
   * Выход: вызываем /auth/logout, очищаем состояние.
   */
  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // если не удалось разлогиниться на бэке — всё равно чистим локально
    }
    dispatch({ type: Action.LOGOUT });
  }

  // мемоизируем value, чтобы не пересоздавать объект на каждый рендер
  const value = useMemo(
    () => ({
      user: state.user,
      ready: state.status !== "INIT" && state.status !== "CHECKING",
      status: state.status,
      login,
      register,
      logout,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}