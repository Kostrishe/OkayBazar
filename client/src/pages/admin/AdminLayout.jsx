import React, { useMemo } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import Background from "../../components/ui/Background";
import { Glass } from "../../components/ui/Glass";
import { useAuth } from "../../auth/useAuth";
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  ShoppingBag,
  Shapes,
  Home,
  User as UserIcon,
  Info,
} from "lucide-react";
import logo from "../../assets/OkayBazar.png";

const nav = [
  { to: "/admin", icon: LayoutDashboard, label: "Обзор", end: true },
  { to: "/admin/users", icon: Users, label: "Пользователи" },
  { to: "/admin/games", icon: Gamepad2, label: "Игры" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Заказы" },
  { to: "/admin/taxonomies", icon: Shapes, label: "Справочники" },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const fullName = user?.full_name || user?.name || "Администратор";
  const email = user?.email || "";

  // подсказка в хедере в зависимости от текущей страницы
  const note = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin/users"))
      return "Просмотр, изменение ролей и управление пользователями";
    if (p.startsWith("/admin/games"))
      return "Редактирование игр, цен, жанров, платформ и медиа";
    if (p.startsWith("/admin/orders"))
      return "Просмотр и редактирование заказов, статусов и оплаты";
    if (p.startsWith("/admin/taxonomies"))
      return "Управление жанрами и платформами";
    return "Обзор метрик и быстрые действия панели";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex text-white">
      <Background />

      {/* Sidebar */}
      <aside className="hidden md:block w-[280px] p-4">
        <Glass
          className="h-[calc(100vh-2rem)] sticky top-4 overflow-y-auto
                     p-4 flex flex-col items-stretch"
        >
          {/* Логотип по центру, крупный */}
          <div className="flex items-center justify-center mt-2">
            <img
              src={logo}
              alt="OkayBazar"
              className="h-20 w-20 rounded-2xl object-contain"
            />
          </div>

          {/* Меню сразу под логотипом — без лишних отступов */}
          <nav className="mt-4 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition
                     ${isActive ? "bg-white/15" : "hover:bg-white/10"}`
                  }
                >
                  <Icon size={18} className="shrink-0 opacity-90" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Кнопка снизу — прижимаем к низу через mt-auto */}
          <div className="mt-auto pt-4 border-t border-white/15 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                         border border-white/25 bg-white/10 hover:bg-white/15
                         transition text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
              title="Вернуться на главную страницу"
            >
              <Home size={18} />
              На главную
            </Link>
          </div>
        </Glass>
      </aside>

      {/* Main */}
      <section className="flex-1 p-4 md:p-6">
        <div className="grid gap-4">
          {/* Хедер админки: слева заголовок, по центру заметка, справа профиль */}
          <Glass className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xl font-semibold tracking-tight">
                Панель администратора
              </div>

              <div className="flex-1 flex items-center justify-center text-center text-sm opacity-90">
                <Info size={16} className="mr-2 shrink-0 opacity-80" />
                <span className="truncate">{note}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium">{fullName}</span>
                  {email ? <span className="text-xs opacity-80">{email}</span> : null}
                </div>
                <div className="h-9 w-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
                  <UserIcon size={16} className="opacity-90" />
                </div>
              </div>
            </div>
          </Glass>

          <Outlet />
        </div>
      </section>
    </div>
  );
}