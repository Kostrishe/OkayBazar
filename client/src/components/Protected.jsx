import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// Protected — компонент для защиты роутов
export default function Protected({ children, role, roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  // пока идёт проверка авторизации — ничего не показываем
  if (!ready) return null;

  // если не залогинен — на страницу авторизации
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // нормализуем массив ролей
  const requiredRoles = roles ?? (role ? [role] : null);
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // если передали children — рендерим как обёртку, иначе — как guard с Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
}