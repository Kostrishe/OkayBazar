import React, { useEffect, useMemo, useReducer } from "react";
import { AuthContext } from "./auth-context";
import { apiFetch, onUnauthorized } from "../lib/api";
import {authReducer,initialAuthState,Action,AuthStatus} from "./auth-reducer";

export default function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => onUnauthorized(() => dispatch({ type: Action.LOGOUT })), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch({ type: Action.START_CHECK });
      try {
        const me = await apiFetch("/auth/me");
        if (!cancelled) dispatch({ type: Action.SET_USER, user: me });
      } catch {
        if (!cancelled) dispatch({ type: Action.SET_ANON });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const r = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const me = r?.user ?? (await apiFetch("/auth/me").catch(() => null));
    dispatch({ type: Action.SET_USER, user: me });
    return me;
  }
  async function register(full_name, email, password) {
    const r = await apiFetch("/auth/register", {
      method: "POST",
      body: { full_name, email, password },
    });
    const me = r?.user ?? (await apiFetch("/auth/me").catch(() => null));
    dispatch({ type: Action.SET_USER, user: me });
    return me;
  }
  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* empty */
    }
    dispatch({ type: Action.LOGOUT });
  }

  const value = useMemo(
    () => ({
      user: state.user,
      ready:
        state.status !== AuthStatus.INIT &&
        state.status !== AuthStatus.CHECKING,
      status: state.status,
      login,
      register,
      logout,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
