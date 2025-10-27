import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Check,
} from "lucide-react";
import { Glass, GlassCard } from "./ui/Glass";
import THEME from "../styles/theme";
import { resolveImage } from "../lib/api";
import { fetchGame, addToCart, fetchCart } from "../services/games";
import { fetchReviewsByGame, createReview } from "../services/reviews";
import { bus } from "../lib/events";

/**
 * Вспомогательная обёртка для цены в рублях (с неразрывным пробелом).
 */
function Rub({ children }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/**
 * Добавляем версию к URL картинки, чтобы сбросить кеш браузера при изменении.
 */
function withVer(url, v) {
  if (!url) return url;
  if (!v) return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(v);
}

/**
 * Модальное окно с подробной информацией об игре.
 * Показывает обложку, скриншоты, описание, цену, платформы, отзывы.
 * Поддерживает добавление в корзину и оставление отзыва.
 */
export default function GameModal({ gameIdOrSlug, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState(null);
  const [platformIdx, setPlatformIdx] = useState(0);
  const [slide, setSlide] = useState(0);

  // версия картинок: меняем → браузер перезагрузит изображения
  const [imgVersion, setImgVersion] = useState(0);

  // состояние корзины
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  // отзывы
  const [reviews, setReviews] = useState([]);
  const [revLoading, setRevLoading] = useState(false);
  const [myReview, setMyReview] = useState({ rating: 5, body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // закрытие модалки по Escape
  const onEsc = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onEsc]);

  // загрузка игры при открытии модалки
  useEffect(() => {
    if (!open || !gameIdOrSlug) return;
    let alive = true;

    setLoading(true);
    setGame(null);
    setReviews([]);
    setSlide(0);
    setPlatformIdx(0);
    setErrorMsg("");

    // сразу выставим версию, чтобы при первом открытии сбить кеш картинок
    setImgVersion(Date.now());

    (async () => {
      try {
        const g = await fetchGame(gameIdOrSlug);
        if (alive) setGame(g);
      } catch (e) {
        if (alive) setErrorMsg("Не удалось загрузить игру");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, gameIdOrSlug]);

  // автообновление данных игры (цены + обложка + скриншоты) каждые ~8 секунд
  useEffect(() => {
    if (!open || !game?.id) return;
    let stop = false;

    const interval = setInterval(async () => {
      if (stop) return;
      try {
        const fresh = await fetchGame(gameIdOrSlug);
        if (!fresh) return;

        setGame((prev) => {
          if (!prev) return fresh;

          const priceChanged =
            Number(prev.base_price ?? 0) !== Number(fresh.base_price ?? 0) ||
            Number(prev.discount_percent ?? 0) !==
              Number(fresh.discount_percent ?? 0) ||
            Number(prev.price_final ?? prev.price ?? 0) !==
              Number(fresh.price_final ?? fresh.price ?? 0);

          const coverChanged =
            (prev.cover_url || "") !== (fresh.cover_url || "");
          const screensChanged =
            JSON.stringify(prev.screenshots ?? []) !==
            JSON.stringify(fresh.screenshots ?? []);

          // если обложка/скрины поменялись — обновим версию картинок
          if (coverChanged || screensChanged) {
            setImgVersion(Date.now());
          }

          if (!priceChanged && !coverChanged && !screensChanged) return prev;

          return {
            ...prev,
            base_price: fresh.base_price,
            discount_percent: fresh.discount_percent,
            price: fresh.price,
            price_final: fresh.price_final,
            cover_url: fresh.cover_url,
            screenshots: fresh.screenshots,
          };
        });
      } catch (e) {
        // тихо игнорируем ошибки обновления
      }
    }, 8000);

    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, [open, game?.id, gameIdOrSlug]);

  /**
   * Загрузка отзывов для игры.
   */
  async function loadReviews(gameId) {
    if (!gameId) return;
    setRevLoading(true);
    setErrorMsg("");
    try {
      const list = await fetchReviewsByGame(gameId);
      setReviews(Array.isArray(list) ? list : []);
    } catch (e) {
      setErrorMsg("Не удалось загрузить отзывы");
    } finally {
      setRevLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !game?.id) return;
    loadReviews(game.id);
  }, [open, game?.id]);

  const platforms = useMemo(() => game?.platforms || [], [game]);

  // мапим картинки с добавлением версии (чтобы сбить кеш)
  const coverUrl = useMemo(() => {
    const raw = resolveImage(game?.cover_url || "");
    return withVer(raw, imgVersion);
  }, [game?.cover_url, imgVersion]);

  const screenshots = useMemo(() => {
    const arr = Array.isArray(game?.screenshots) ? game.screenshots : [];
    return arr.map((s) => {
      const raw = typeof s === "string" ? resolveImage(s) : resolveImage(s.url);
      return typeof s === "string"
        ? { url: withVer(raw, imgVersion), alt: "" }
        : { ...s, url: withVer(raw, imgVersion) };
    });
  }, [game?.screenshots, imgVersion]);

  // цены/скидки: единые для всех платформ
  const dp = Number(game?.discount_percent ?? 0);

  const basePrice = useMemo(() => {
    const n = Number(game?.base_price ?? NaN);
    return Number.isFinite(n) ? n : null;
  }, [game]);

  const finalPrice = useMemo(() => {
    const n = Number(game?.price_final ?? game?.price ?? NaN);
    return Number.isFinite(n) ? n : null;
  }, [game]);

  const hasDiscount =
    dp > 0 && basePrice != null && finalPrice != null && finalPrice < basePrice;

  const priceNow = finalPrice ?? basePrice ?? null;

  const fmt = (n) =>
    n == null ? "" : Math.round(Number(n)).toLocaleString("ru-RU") + " ₽";

  /**
   * Добавление игры в корзину.
   */
  async function handleAdd() {
    if (!game?.id) return;
    try {
      setAdding(true);
      const updated = await addToCart(game.id, 1);
      const payload = updated?.items ? updated : await fetchCart();

      // эмитим событие для обновления счётчика в хедере
      if (bus?.emit) bus.emit("cart:updated", payload);
      window.dispatchEvent?.(
        new CustomEvent("cart:updated", { detail: payload })
      );

      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (e) {
      // тихо игнорируем ошибку, можно показать уведомление
    } finally {
      setAdding(false);
    }
  }

  /**
   * Отправка отзыва.
   */
  async function submitReview(e) {
    e.preventDefault();
    if (!game?.id) return;

    const body = (myReview.body || "").trim();
    const rating = Math.min(Math.max(Number(myReview.rating || 0), 1), 5);

    if (!body) {
      setErrorMsg("Напишите пару слов — поле отзыва пустое");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await createReview({ game_id: game.id, rating, body });
      setMyReview({ rating: 5, body: "" });
      await loadReviews(game.id);
    } catch (err) {
      const raw = String(err?.message || "");
      if (
        err?.code === 401 ||
        raw.includes("auth_required") ||
        raw.includes("401")
      ) {
        setErrorMsg("Войдите в аккаунт, чтобы оставить отзыв.");
      } else if (raw.includes("bad_payload")) {
        setErrorMsg(
          "Неверные данные отзыва. Проверьте оценку и попробуйте снова."
        );
      } else {
        setErrorMsg(raw || "Не удалось отправить отзыв.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Оверлей */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative">
        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          aria-label="Закрыть"
          className="absolute -top-4 -right-4 md:-top-5 md:-right-5 z-[1100]
                     h-10 w-10 rounded-full bg-black/65 text-white
                     border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.45)]
                     hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X className="w-5 h-5 m-auto" />
        </button>

        <Glass
          className="relative max-w-6xl w-[96vw] md:w-[92vw] xl:w-[1100px] max-h-[90vh] overflow-hidden rounded-2xl"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[480px] text-white/80">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Загружаем игру…
            </div>
          ) : !game ? (
            <div className="flex items-center justify-center h-[480px] text-white/80">
              <ImageIcon className="w-5 h-5 mr-2" />
              Не удалось загрузить данные игры
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Левая колонка: обложка, инфо, цена */}
              <div className="p-5 border-r border-white/15">
                <GlassCard className="rounded-2xl overflow-hidden">
                  <div className="aspect-[16/10] w-full">
                    {game.cover_url ? (
                      <img
                        src={coverUrl}
                        alt={game.title}
                        className="w-full h-full object-cover block rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/10 text-white/70">
                        нет обложки
                      </div>
                    )}
                  </div>
                </GlassCard>

                <h1 className="mt-4 text-2xl font-semibold text-white">
                  {game.title}
                </h1>

                {/* Мета-информация */}
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-white/80">
                  <div>
                    <span className="text-white/60">Разработчик:</span>{" "}
                    {game.developer || "—"}
                  </div>
                  <div>
                    <span className="text-white/60">Издатель:</span>{" "}
                    {game.publisher || "—"}
                  </div>
                  <div>
                    <span className="text-white/60">Жанры:</span>{" "}
                    {(game.genres || []).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="text-white/60">Возраст:</span>{" "}
                    {game.age_rating || "—"}
                  </div>
                </div>

                {/* Платформы (только выбор, на цену не влияет) */}
                {!!platforms.length && (
                  <div className="mt-4">
                    <div className="text-white/80 text-sm mb-2">Платформа</div>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map((p, idx) => (
                        <button
                          key={`${p.platform}-${p.platform_id}-${idx}`}
                          type="button"
                          onClick={() => setPlatformIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                            idx === platformIdx
                              ? "bg-white/20 text-white border-white/40"
                              : "bg-white/10 text-white/85 border-white/20 hover:bg-white/15"
                          }`}
                        >
                          {p.platform}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Цена + корзина */}
                <div className="mt-5 flex items-end justify-between">
                  <div className="flex items-baseline gap-3">
                    {hasDiscount && basePrice && (
                      <div className="text-white/60 line-through text-sm">
                        <Rub>{fmt(basePrice)}</Rub>
                      </div>
                    )}
                    <div className="text-2xl font-semibold text-white">
                      <Rub>{priceNow != null ? fmt(priceNow) : "—"}</Rub>
                    </div>
                    {hasDiscount && (
                      <div
                        className="text-xs uppercase px-2.5 py-1 rounded-full border"
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderColor: "rgba(255,255,255,0.35)",
                        }}
                        title="Скидка от базовой цены"
                      >
                        −{dp}%
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding}
                    className="rounded-lg px-4 py-2 text-sm font-medium border flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60"
                    style={{
                      background: THEME.accent,
                      color: "#fff",
                      borderColor: "transparent",
                    }}
                    aria-label="Добавить в корзину"
                  >
                    {added ? (
                      <>
                        <Check className="w-4 h-4" /> Добавлено
                      </>
                    ) : adding ? (
                      "Добавляем..."
                    ) : (
                      "В корзину"
                    )}
                  </button>
                </div>

                <div className="mt-5 text-white/85 text-sm leading-relaxed">
                  {game.description || "Описание скоро будет."}
                </div>
              </div>

              {/* Правая колонка: слайдер скриншотов + отзывы */}
              <div className="p-5">
                {/* Слайдер */}
                <div className="relative">
                  <GlassCard className="rounded-2xl overflow-hidden">
                    <div className="relative aspect-[16/9]">
                      {screenshots.length ? (
                        <img
                          src={screenshots[slide].url}
                          alt={screenshots[slide].alt || game.title}
                          className="absolute inset-0 w-full h-full object-cover block rounded-2xl"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/10 text-white/70">
                          Скриншоты отсутствуют
                        </div>
                      )}

                      {screenshots.length > 1 && (
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between p-2">
                          <button
                            type="button"
                            className="p-2 rounded-full bg-black/35 hover:bg-black/45 border border-white/30 z-10"
                            onClick={() =>
                              setSlide(
                                (s) =>
                                  (s - 1 + screenshots.length) %
                                  screenshots.length
                              )
                            }
                            aria-label="Предыдущий скрин"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-full bg-black/35 hover:bg-black/45 border border-white/30 z-10"
                            onClick={() =>
                              setSlide((s) => (s + 1) % screenshots.length)
                            }
                            aria-label="Следующий скрин"
                          >
                            <ChevronRight className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Мини-превью */}
                  {!!screenshots.length && (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {screenshots.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlide(i)}
                          className={`aspect-[16/10] overflow-hidden rounded-xl border ${
                            i === slide
                              ? "border-white/60"
                              : "border-white/25 opacity-80 hover:opacity-100"
                          }`}
                          title={s.alt || `Скрин ${i + 1}`}
                        >
                          <img
                            src={s.url}
                            alt=""
                            className="w-full h-full object-cover block rounded-xl"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Отзывы */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Отзывы</h3>
                    <div className="text-white/60 text -sm">
                      {reviews.length} шт.
                    </div>
                  </div>
                  {revLoading ? (
                    <div className="text-white/70 mt-3 text-sm">
                      Загружаем отзывы…
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-white/70 mt-3 text-sm">
                      Отзывов пока нет — будьте первым!
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {reviews.map((r, idx) => (
                        <Glass key={idx} className="p-3 rounded-xl">
                          <div className="flex items-center gap-2 text-white">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4"
                                style={{
                                  fill:
                                    i < (Number(r.rating) || 0)
                                      ? "#FFFFFF"
                                      : "transparent",
                                  color: "#FFFFFF",
                                }}
                              />
                            ))}
                          </div>
                          {r.body && (
                            <p className="mt-2 text-white/85 text-sm leading-relaxed">
                              {r.body}
                            </p>
                          )}
                          <div className="mt-2 text-white/60 text-xs">
                            {r.user || r.user_name || "Аноним"}
                            {r.created_at ? (
                              <>
                                {" "}
                                ·{" "}
                                {new Date(r.created_at).toLocaleDateString(
                                  "ru-RU"
                                )}
                              </>
                            ) : null}
                          </div>
                        </Glass>
                      ))}
                    </div>
                  )}

                  {/* Ошибка формы (если есть) */}
                  {errorMsg && (
                    <div className="mt-3 text-[13px] text-red-300">
                      {errorMsg}
                    </div>
                  )}

                  {/* Форма отзыва */}
                  <form onSubmit={submitReview} className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-sm">
                        Ваша оценка:
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            onClick={() =>
                              setMyReview((v) => ({ ...v, rating: n }))
                            }
                            className="p-1"
                            aria-label={`Оценка ${n}`}
                          >
                            <Star
                              className="w-5 h-5"
                              style={{
                                fill:
                                  n <= (myReview.rating || 0)
                                    ? "#FFFFFF"
                                    : "transparent",
                                color: "#FFFFFF",
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      className="w-full rounded-xl px-3 py-2 bg-white/10 text-white placeholder-white/50 border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/30"
                      placeholder="Поделитесь впечатлениями об игре"
                      value={myReview.body}
                      onChange={(e) =>
                        setMyReview((v) => ({ ...v, body: e.target.value }))
                      }
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg px-4 py-2 text-sm font-medium border hover:opacity-95 disabled:opacity-60"
                        style={{
                          background: THEME.accent,
                          color: "#fff",
                          borderColor: "transparent",
                        }}
                      >
                        {submitting ? "Отправляем…" : "Оставить отзыв"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}