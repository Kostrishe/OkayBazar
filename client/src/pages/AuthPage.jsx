import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import THEME from "../styles/theme";
import { Glass } from "../components/ui/Glass";
import Background from "../components/ui/Background";
import { useAuth } from "../auth/useAuth";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || "/";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.full_name, form.email, form.password);
      }
      navigate(backTo, { replace: true });
    } catch (e) {
      setErr(e?.message || "Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Background />
      <Glass className="w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">
            {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
          </h1>
          <a href="/" className="text-white/70 hover:text-white text-sm">
            На главную
          </a>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-3 py-2 rounded-lg border ${
              mode === "login"
                ? "bg-white/20 text-white"
                : "text-white/80 border-white/30"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`px-3 py-2 rounded-lg border ${
              mode === "register"
                ? "bg-white/20 text-white"
                : "text-white/80 border-white/30"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="block text-white/80 text-sm mb-1">Имя</label>
              <input
                className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Как к вам обращаться"
              />
            </div>
          )}

          <div>
            <label className="block text-white/80 text-sm mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-white/80 text-sm mb-1">Пароль</label>
            <input
              type="password"
              required
              className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          {err && <div className="text-red-300 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-2 border text-white"
            style={{ background: THEME.accent, borderColor: "transparent" }}
          >
            {loading
              ? "Подождите..."
              : mode === "login"
              ? "Войти"
              : "Зарегистрироваться"}
          </button>
        </form>
      </Glass>
    </div>
  );
}
