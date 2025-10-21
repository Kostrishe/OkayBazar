// src/components/Protected.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function Protected({ children, role, roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  // нормализуем массив ролей
  const requiredRoles = roles ?? (role ? [role] : null);
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // если передали children — рендерим как обёртку, иначе — как guard c Outlet
  if (children) return <>{children}</>;
  return <Outlet />;
}
