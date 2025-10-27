import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Glass } from "../components/ui/Glass";
import Background from "../components/ui/Background";
import THEME from "../styles/theme";
import { useAuth } from "../auth/useAuth";
import {
  getProfile,
  updateProfile,
  changePassword,
  fetchMyOrders,
} from "../services/account";
import {
  ShieldCheck,
  Package,
  ChevronDown,
  PackageCheck,
  PackageOpen,
} from "lucide-react";
import { getOrder } from "../services/orders";
import { logout } from "../services/auth";


export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // профиль
  const [form, setForm] = useState({ full_name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  // смена пароля
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurr, setPwCurr] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  // заказы
  const [orders, setOrders] = useState(null);
  const [ordersError, setOrdersError] = useState("");
  const [open, setOpen] = useState({});
  const [visibleCount, setVisibleCount] = useState(5);

  /**
   * Вспомогательный компонент для отображения цены в рублях.
   */
  const Rub = ({ value = 0 }) => (
    <span className="tabular-nums">
      {Number(value).toLocaleString("ru-RU")} ₽
    </span>
  );

  /**
   * Преобразование статуса в читаемый текст.
   */
  const getStatusText = (status) => {
    const map = {
      pending: "В обработке",
      fulfilled: "Выполнен",
      captured: "Оплачен",
      failed: "Отменён",
      cancelled: "Отменён",
      issued: "Выдан",
    };
    return map[status] || status;
  };

  /**
   * Цвета для бейджей статусов.
   */
  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/15 text-yellow-300 border-yellow-400/30",
      fulfilled: "bg-green-500/15 text-green-300 border-green-400/30",
      captured: "bg-blue-500/15 text-blue-300 border-blue-400/30",
      failed: "bg-red-500/15 text-red-300 border-red-400/30",
      cancelled: "bg-red-500/15 text-red-300 border-red-400/30",
      issued: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    };
    return colors[status] || "bg-gray-500/15 text-gray-300 border-gray-400/30";
  };

  /**
   * Бейдж статуса с иконкой.
   */
  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      {status === "issued" || status === "fulfilled" ? (
        <PackageCheck size={14} />
      ) : (
        <PackageOpen size={14} />
      )}
      {getStatusText(status)}
    </span>
  );

  /**
   * Чип для отображения заметок.
   */
  const NoteChip = ({ note }) => (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/80">
      {note || "—"}
    </span>
  );

  // загрузка профиля и заказов при монтировании
  useEffect(() => {
    // профиль
    (async () => {
      try {
        const me = await getProfile();
        setForm({ full_name: me.full_name || "", email: me.email || "" });
        if (setUser) setUser(me);
      } catch {
        // тихо игнорируем ошибку
      }
    })();

    // заказы
    (async () => {
      try {
        const list = await fetchMyOrders();
        const base = Array.isArray(list?.items)
          ? list.items
          : Array.isArray(list)
          ? list
          : [];

        // обогащаем каждый заказ детальной информацией
        const enriched = await Promise.all(
          base.map(async (o) => {
            try {
              const full = await getOrder(o.id);
              const items = Array.isArray(full?.items) ? full.items : [];

              return {
                ...o,
                ...full,
                _items: items,
              };
            } catch {
              return { ...o, _items: [] };
            }
          })
        );

        // сортируем: самые новые сверху
        enriched.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });

        setOrders(enriched);
        setVisibleCount(5);
      } catch {
        setOrders([]);
        setOrdersError("Не удалось загрузить заказы");
      }
    })();
  }, [setUser]);

  /**
   * Сохранение изменений профиля.
   */
  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const updated = await updateProfile({
        full_name: form.full_name,
        email: form.email,
      });
      setNotice("Профиль обновлён");
      if (setUser) setUser(updated);
    } catch {
      setNotice("Не удалось сохранить. Проверьте данные.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Смена пароля с последующим разлогином.
   */
  async function onChangePassword() {
    setPwMsg("");
    if (!pwCurr || !pwNew) return setPwMsg("Заполните поля");
    if (pwNew !== pwNew2) return setPwMsg("Новые пароли не совпадают");

    setPwLoading(true);
    try {
      await changePassword({ currentPassword: pwCurr, newPassword: pwNew });

      // разлогиниваем пользователя
      try {
        await logout();
      } catch {
        // игнорируем ошибку logout
      }
      if (setUser) setUser(null);
      try {
        localStorage.removeItem("token");
      } catch {
        // игнорируем ошибку localStorage
      }
      navigate("/login", { replace: true });
    } catch {
      setPwMsg("Не удалось сменить пароль");
    } finally {
      setPwLoading(false);
    }
  }

  const canShowMore = Array.isArray(orders) && orders.length > visibleCount;

  return (
    <div className="max-w-5xl mx-auto my-8 px-4">
      <Background />

      {/* Профиль */}
      <Glass className="p-6">
        <h1 className="text-2xl font-semibold text-white mb-6">Профиль</h1>
        <form onSubmit={onSave} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm mb-1">Имя</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
              value={form.full_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, full_name: e.target.value }))
              }
              placeholder="Ваше имя"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm mb-1">Email</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setPwOpen(true)}
              className="rounded-xl px-4 py-2 border text-white hover:opacity-95"
              style={{
                background: "rgba(255,255,255,0.12)",
                borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              Сменить пароль
            </button>

            <div className="flex items-center gap-3">
              {notice && (
                <span className="text-white/80 text-sm">{notice}</span>
              )}
              <button
                className="rounded-xl px-4 py-2 border text-white disabled:opacity-60"
                disabled={saving}
                style={{ background: THEME.accent, borderColor: "transparent" }}
              >
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {user?.role === "admin" && (
            <div className="mt-4">
              <Link
                to="/admin"
                className="rounded-xl px-4 py-2 border text-white hover:opacity-95 inline-block"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                Перейти в дашборд
              </Link>
            </div>
          )}
        </form>
      </Glass>

      {/* Заказы */}
      <Glass className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-white/90" />
          <h2 className="text-xl font-semibold text-white">Мои заказы</h2>
        </div>

        {orders === null ? (
          <div className="animate-pulse h-24 rounded-xl bg-white/10" />
        ) : orders.length === 0 ? (
          <div className="text-white/70">
            {ordersError || "У вас пока нет заказов"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {orders.slice(0, visibleCount).map((o, i) => {
                const created = o.created_at
                  ? new Date(o.created_at).toLocaleString("ru-RU")
                  : "";
                const isOpen = !!open[o.id];

                return (
                  <div
                    key={o.id ?? i}
                    className="mb-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg"
                  >
                    {/* Шапка заказа */}
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors rounded-t-2xl">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            setOpen((s) => ({ ...s, [o.id]: !s[o.id] }))
                          }
                          className={
                            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 " +
                            "hover:bg-white/20 transition-all duration-200 " +
                            (isOpen ? "rotate-180" : "")
                          }
                          aria-label={isOpen ? "Свернуть" : "Развернуть"}
                          title={isOpen ? "Свернуть" : "Развернуть"}
                        >
                          <ChevronDown size={16} />
                        </button>
                        <span className="text-white font-semibold text-lg">
                          #{o.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-white/90">
                        <StatusBadge status={o.status} />
                        <StatusBadge status={o.payment_status} />
                        {o.notes && <NoteChip note={o.notes} />}
                        <Rub value={o.total_amount ?? 0} />
                        <span>{created}</span>
                      </div>
                    </div>

                    {/* Детали заказа */}
                    {isOpen && (
                      <div className="p-4 border-t border-white/10 bg-white/5">
                        {Array.isArray(o._items) && o._items.length > 0 ? (
                          <div className="rounded-xl border border-white/15 bg-white/5 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <table className="w-full text-[13px]">
                              <thead>
                                <tr className="text-left text-white/80 bg-gradient-to-b from-white/15 to-white/5 border-b border-white/10">
                                  <th className="py-2 pl-3 pr-3 rounded-tl-xl">
                                    Игра
                                  </th>
                                  <th className="py-2 pr-3">Платформа</th>
                                  <th className="py-2 pr-3">Цена</th>
                                  <th className="py-2 pr-3">Статус</th>
                                  <th className="py-2 pr-3 rounded-tr-xl">
                                    Выдано
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="text-white/90 divide-y divide-white/10">
                                {o._items.map((it, idx) => (
                                  <tr
                                    key={it.id ?? idx}
                                    className="hover:bg-white/5 transition-colors"
                                  >
                                    <td className="py-2 pl-3 pr-3">
                                      {it.game_title ||
                                        it.title ||
                                        `#${it.game_id}`}
                                    </td>
                                    <td className="py-2 pr-3">
                                      {it.platform ||
                                        it.platform_name ||
                                        `#${it.platform_id}`}
                                    </td>
                                    <td className="py-2 pr-3">
                                      <Rub value={it.unit_price ?? 0} />
                                    </td>
                                    <td className="py-2 pr-3">
                                      <StatusBadge
                                        status={
                                          it.fulfillment_status || "pending"
                                        }
                                      />
                                    </td>
                                    <td className="py-2 pr-3">
                                      {it.delivered_at
                                        ? new Date(
                                            it.delivered_at
                                          ).toLocaleString("ru-RU")
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-white/70">
                            Нет позиций в заказе.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {canShowMore && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => setVisibleCount((n) => n + 5)}
                  className="rounded-xl px-4 py-2 border text-white hover:opacity-95"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                >
                  Показать ещё
                </button>
              </div>
            )}
          </>
        )}
      </Glass>

      {/* Модалка смены пароля */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setPwOpen(false)}
          />
          <Glass className="relative p-5 w-full max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-white/90" />
              <h3 className="text-lg font-semibold text-white">
                Сменить пароль
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Текущий пароль
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={pwCurr}
                  onChange={(e) => setPwCurr(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Новый пароль
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">
                  Повторите новый пароль
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={pwNew2}
                  onChange={(e) => setPwNew2(e.target.value)}
                />
              </div>
              {!!pwMsg && <div className="text-white/80 text-sm">{pwMsg}</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl px-4 py-2 border text-white"
                onClick={() => setPwOpen(false)}
                style={{
                  background: "transparent",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                Отмена
              </button>
              <button
                className="rounded-xl px-4 py-2 border text-white disabled:opacity-60"
                onClick={onChangePassword}
                disabled={pwLoading}
                style={{ background: THEME.accent, borderColor: "transparent" }}
              >
                {pwLoading ? "Сохраняю..." : "Сменить пароль"}
              </button>
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}