import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  LogIn,
  LogOut,
  User,
  ShoppingCart,
  X,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, NavLink } from "react-router-dom";
import { Glass } from "./ui/Glass";
import THEME from "../styles/theme";
import logo from "../assets/OkayBazar.png";
import { fetchCart, removeFromCart, clearCart } from "../services/games";
import { useAuth } from "../auth/useAuth";

/**
 * MiniCart — всплывающая корзина со списком товаров.
 */
function MiniCart({ open, onClose }) {
  const ref = useRef(null);
  const [payload, setPayload] = useState({ items: [], count: 0, total: 0 });

  // закрытие по клику вне корзины
  useEffect(() => {
    function onDoc(e) {
      if (open && ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  // загрузка корзины + подписка на события обновления
  useEffect(() => {
    let stopped = false;

    (async () => {
      try {
        const data = await fetchCart();
        if (!stopped) setPayload(data || { items: [], count: 0, total: 0 });
      } catch {
        if (!stopped) setPayload({ items: [], count: 0, total: 0 });
      }
    })();

    const onCartUpdated = (e) => e?.detail && setPayload(e.detail);
    window.addEventListener("cart:updated", onCartUpdated);

    return () => {
      stopped = true;
      window.removeEventListener("cart:updated", onCartUpdated);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed right-4 top-16 z-[100]"
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div ref={ref} className="relative">
            <motion.div
              className="w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-white/30 text-white"
              style={{
                background:
                  "linear-gradient(145deg, rgba(36,40,45,0.95) 0%, rgba(46,50,55,0.85) 100%)",
                boxShadow:
                  "0 0 20px rgba(0,0,0,0.45), inset 0 0 20px rgba(255,255,255,0.02)",
                backdropFilter: "blur(6px)",
              }}
              initial={{ filter: "blur(8px)", opacity: 0.7 }}
              animate={{ filter: "blur(0px)", opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
                <div className="text-sm font-semibold text-white/90">
                  Корзина {payload.count ? `· ${payload.count}` : ""}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/30 text-white/80"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div className="px-2 py-2">
                <div className="rounded-xl overflow-hidden border border-white/20 bg-[#2b2f35]">
                  {Array.isArray(payload.items) && payload.items.length > 0 ? (
                    <ul className="max-h-[44vh] overflow-y-auto divide-y divide-white/10">
                      {payload.items.map((it, idx) => {
                        const itemId =
                          it.itemId ?? it.item_id ?? it.id ?? `tmp-${idx}`;
                        const name =
                          it.name ??
                          it.game_name ??
                          it.title ??
                          it.game_title ??
                          it.game?.name ??
                          "Без названия";
                        const price = Number(
                          it.price ??
                            it.unit_price ??
                            it.price_final ??
                            it.amount ??
                            0
                        );

                        return (
                          <li
                            key={itemId}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#30343A] transition"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white truncate">
                                {name}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-sm font-semibold text-white tabular-nums">
                                {price.toLocaleString()} ₽
                              </div>
                              <button
                                onClick={async () => {
                                  try {
                                    const updated = await removeFromCart(
                                      itemId
                                    );
                                    const next = updated || {
                                      items: [],
                                      count: 0,
                                      total: 0,
                                    };
                                    setPayload(next);
                                    window.dispatchEvent(
                                      new CustomEvent("cart:updated", {
                                        detail: next,
                                      })
                                    );
                                  } catch (e) {
                                    // тихо игнорируем ошибку
                                  }
                                }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/30 text-white/80"
                                aria-label="Удалить"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="px-4 py-8 text-center text-white/70 text-sm">
                      Ваша корзина пуста
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-white/80">Итого</div>
                  <div className="text-base font-semibold text-white">
                    {Number(payload.total || 0).toLocaleString()} ₽
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to="/checkout"
                    onClick={onClose}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Перейти к оформлению <ArrowRight size={16} />
                  </Link>

                  {Array.isArray(payload.items) && payload.items.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const updated = await clearCart();
                          const next = updated?.items
                            ? updated
                            : await fetchCart();
                          setPayload(next);
                          window.dispatchEvent(
                            new CustomEvent("cart:updated", { detail: next })
                          );
                        } catch (e) {
                          // тихо игнорируем ошибку
                        }
                      }}
                      className="rounded-xl px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/30 text-white/80"
                    >
                      Очистить
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// NavItem — пункт меню с подчёркиванием активного роута
function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative transition ${
          isActive ? "text-white" : "text-white/80 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && (
            <span
              className="absolute -bottom-2 left-0 right-0 h-[2px]"
              style={{ background: THEME.accent }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Header() {
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  // Обновление счётчика корзины
  async function refreshCounter() {
    try {
      const p = await fetchCart();
      setCount(Number(p?.count || 0));
    } catch (e) {
      setCount(0);
    }
  }

  useEffect(() => {
    refreshCounter();

    function onCartUpdated(e) {
      setCount(Number(e?.detail?.count || 0));
    }
    window.addEventListener("cart:updated", onCartUpdated);
    return () => window.removeEventListener("cart:updated", onCartUpdated);
  }, []);

  return (
    <>
      {/* Фиксированный хедер */}
      <header
        className="fixed inset-x-0 top-0 z-[100]"
        style={{ transform: "translateZ(0)" }}
      >
        <Glass className="my-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex h-16 items-center justify-between">
            {/* Логотип */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="OkayBazar"
                className="w-16 h-16 rounded-2xl"
                style={{
                  filter: "drop-shadow(0 0 18px rgba(255,255,255,0.45))",
                  transform: "translateY(1px)",
                }}
              />
              <span className="text-xl font-semibold tracking-wide text-white">
                OkayBazar
              </span>
            </Link>

            {/* Навигация */}
            <nav className="hidden md:flex items-center gap-6">
              <NavItem to="/">Главная</NavItem>
              <NavItem to="/catalog">Каталог</NavItem>
            </nav>

            {/* Поиск, корзина, авторизация */}
            <div className="flex items-center gap-3 w-1/2 max-w-lg relative">
              <div className="relative flex-1">
                <input
                  placeholder="Поиск игр"
                  className="w-full rounded-xl pl-10 pr-4 py-2 bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Корзина */}
              <button
                type="button"
                className="relative inline-flex items-center justify-center rounded-xl p-2 bg-white/15 text-white border border-white/30 transition hover:bg-white/20 cursor-pointer"
                aria-label="Корзина"
                onClick={() => setOpen((o) => !o)}
              >
                <ShoppingCart className="w-5 h-5" />
                {count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[10px] px-1.5 py-[2px] rounded-full border border-white/40"
                    style={{ background: THEME.accent, color: "#fff" }}
                  >
                    {count}
                  </span>
                )}
              </button>

              {/* Авторизация */}
              {!ready ? (
                <div className="w-[130px] h-9 rounded-xl bg-white/15 border border-white/30 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="inline-flex h-10 items-center gap-2.5 rounded-xl px-4 bg-white/15 text-white border border-white/30 transition hover:bg-white/20"
                    aria-label="Профиль"
                  >
                    <User className="w-5 h-5 block" />
                    <span className="truncate max-w-[140px] leading-none">
                      {user?.full_name || user?.email}
                    </span>
                  </Link>

                  <button
                    onClick={logout}
                    className="inline-flex h-10 items-center gap-2.5 rounded-xl px-4 bg-white/15 text-white border border-white/30 transition hover:bg-white/20"
                    aria-label="Выйти"
                  >
                    <LogOut className="w-5 h-5 block" />
                    <span className="leading-none">Выйти</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex h-10 items-center gap-2.5 rounded-xl px-4 bg-white/15 text-white border border-white/30 transition hover:bg-white/20"
                  aria-label="Войти"
                >
                  <LogIn className="w-5 h-5 block" />
                  <span className="leading-none">Войти</span>
                </Link>
              )}

              <MiniCart open={open} onClose={() => setOpen(false)} />
            </div>
          </div>
        </Glass>
      </header>

      {/* Спейсер под фиксированный хедер */}
      <div className="h-24" />
    </>
  );
}
