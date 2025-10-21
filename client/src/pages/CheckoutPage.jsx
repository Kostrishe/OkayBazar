import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchCart } from "../services/games";
import { confirmOrder } from "../services/orders";
import { removeCartItem } from "../services/cart"; // NEW
import THEME from "../styles/theme";
import { X, ArrowLeft, CreditCard, Check } from "lucide-react";
import Background from "../components/ui/Background"; // NEW

function Rub({ value }) {
  const n = Number(value || 0);
  return <>{n.toLocaleString("ru-RU")} ₽</>;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState({ items: [], count: 0, total: 0 });

  // форма
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchCart();
      setCart(p || { items: [], count: 0, total: 0 });
      // синхронизируем бейдж в хэдере
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: p }));
    } catch {
      setCart({ items: [], count: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const disabled = useMemo(() => {
    return (
      submitting ||
      loading ||
      !email ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !cart.items?.length ||
      !agree
    );
  }, [submitting, loading, email, cart.items, agree]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (disabled) return;

    try {
      setSubmitting(true);

      const res = await confirmOrder({
        contactEmail: email,
        paymentMethod,
        notes: null,
      });

      // синхронизуем мини-корзину/бейдж
      window.dispatchEvent(
        new CustomEvent("cart:updated", {
          detail: { items: [], count: 0, total: 0 },
        })
      );

      const orderId = res?.id ?? res?.order?.id ?? res?.data?.id;

      if (orderId) {
        navigate(`/orders/success/${orderId}`, { replace: true });
        return;
      }

      // если сервер не вернул id — не уводим в профиль, а показываем ошибку
      console.log("confirmOrder() response:", res);
      setError("Не удалось получить номер заказа. Попробуйте ещё раз.");
    } catch (e) {
      setError(e?.message || "Не удалось подтвердить заказ");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemoveItem(rowId) {
    try {
      await removeCartItem(rowId);
      await loadCart();
    } catch (e) {
      setError(e?.message || "Не удалось удалить товар");
    }
  }

  return (
    <div className="relative">
      {/* Фон */}
      <Background />

      <div className="relative max-w-5xl mx-auto py-10 px-4">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-base"
          >
            <ArrowLeft size={18} /> На главную
          </Link>
          <h1 className="text-3xl font-bold text-white">Оформление заказа</h1>
          <div />
        </div>

        {/* Основная сетка */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список покупок */}
          <section className="lg:col-span-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
            <h2 className="text-xl font-semibold text-white mb-4">
              Ваши товары
            </h2>

            {loading ? (
              <div className="h-28 rounded-2xl bg-white/10 border border-white/20 animate-pulse" />
            ) : cart.items?.length ? (
              <ul className="divide-y divide-white/10">
                {cart.items.map((it) => {
                  const img =
                    it.cover_url ||
                    it.cover ||
                    it.image_url ||
                    it.image ||
                    null;
                  const title = it.title || it.game_title || "Игра";
                  const platform = it.platform || it.platform_name || "";
                  // subtotal приходит у некоторых реализаций, иначе берём unit_price * qty (qty сервер уже держит)
                  const price =
                    it.subtotal ??
                    Number(it.unit_price || 0) * Number(it.qty || 1);
                  return (
                    <li key={it.id} className="py-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt={title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <CreditCard size={20} className="opacity-70" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-white truncate">
                          {title}
                        </div>
                        <div className="text-sm text-white/70 truncate">
                          {platform}
                        </div>
                      </div>

                      <div className="text-base font-bold text-white tabular-nums">
                        <Rub value={price} />
                      </div>

                      {/* Удалить */}
                      <button
                        aria-label="Удалить"
                        title="Удалить"
                        onClick={() => onRemoveItem(it.id)}
                        className="ml-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-white/80 text-lg">Корзина пуста.</div>
            )}
          </section>

          {/* Итог + форма */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Контакты + оплата */}
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-3">
                Куда отправить ключи
              </h3>

              <label className="block text-sm text-white/80 mb-1">
                E-mail для получения ключей
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <h3 className="text-lg font-semibold text-white mt-5 mb-2">
                Способ оплаты
              </h3>
              <div className="space-y-2 text-base">
                <label className="flex items-center gap-2 text-white/90">
                  <input
                    type="radio"
                    name="pm"
                    className="accent-white"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  Банковская карта
                </label>
                <label className="flex items-center gap-2 text-white/90">
                  <input
                    type="radio"
                    name="pm"
                    className="accent-white"
                    value="yookassa"
                    checked={paymentMethod === "yookassa"}
                    onChange={() => setPaymentMethod("yookassa")}
                  />
                  ЮKassa (демо)
                </label>
              </div>

              <label className="mt-4 flex items-center gap-2 text-white/80 text-sm">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                Согласен с условиями и политикой возврата
              </label>

              {error && (
                <div className="mt-3 text-sm text-red-300">{error}</div>
              )}

              <button
                type="submit"
                disabled={disabled}
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-white ${
                  disabled
                    ? "bg-white/20 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {submitting ? (
                  "Отправляем..."
                ) : (
                  <>
                    Подтвердить заказ <Check size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Итого */}
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5">
              <div className="flex items-center justify-between text-white/90 text-lg">
                <span>Итого</span>
                <strong className="tabular-nums">
                  <Rub value={cart.total} />
                </strong>
              </div>
              <p className="mt-2 text-sm text-white/70">
                После подтверждения вы получите контакт продавца и письмо с
                ключами на указанный e-mail.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
