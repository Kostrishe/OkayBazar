import React, { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { GlassCard } from "./ui/Glass";
import THEME from "../styles/theme";
import { addToCart, fetchCart } from "../services/games";

/**
 * Форматирование цены в рублях (целые, без копеек)
 */
function formatRubNoCoins(v) {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return (
    Math.round(n).toLocaleString("ru-RU", {
      useGrouping: true,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }) + " ₽"
  );
}

export default function ProductCard({
  id,
  name = "Без названия",
  publisher = "",
  price,
  oldPrice,
  discountPercent = 0,
  image = "",
  href = "#",
  onOpen,
}) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgBroken, setImgBroken] = useState(!image);

  const formattedPrice = useMemo(
    () => (typeof price === "string" ? price : formatRubNoCoins(price)),
    [price]
  );

  const formattedOldPrice = useMemo(() => {
    if (oldPrice == null || oldPrice === "" || Number(discountPercent) <= 0)
      return "";
    return typeof oldPrice === "string" ? oldPrice : formatRubNoCoins(oldPrice);
  }, [oldPrice, discountPercent]);

  /**
   * Добавление в корзину
   */
  async function handleAdd(e) {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      setLoading(true);

      const updated = await addToCart(id, 1);
      const payload = updated?.items ? updated : await fetchCart();

      window.dispatchEvent(
        new CustomEvent("cart:updated", { detail: payload })
      );

      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (e) {
        console.error("Ошибка добавления в корзину:", e);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Открытие модалки по клику на карточку
   */
  function handleOpen(e) {
    e?.preventDefault?.();
    if (typeof onOpen === "function") onOpen();
  }

  function handleKeyOpen(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (typeof onOpen === "function") onOpen();
    }
  }

  return (
    <div
      className="group relative rounded-2xl overflow-visible
                 bg-[rgba(13,17,23,0.92)]
                 ring-1 ring-white/10 shadow-[0_6px_30px_rgba(0,0,0,0.25)]"
      aria-label={name}
    >
      <GlassCard>
        {/* Кликабельная зона карточки */}
        <a
          href={href}
          onClick={handleOpen}
          onKeyDown={handleKeyOpen}
          tabIndex={0}
          className="relative w-full aspect-[16/9] overflow-visible block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-2xl"
          aria-label={`Открыть игру: ${name}`}
          rel="nofollow"
        >
          {/* Мягкая тень под карточкой при ховере */}
          <div
            className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-3
                       h-4 w-[78%] rounded-full bg-black/55 blur-2xl opacity-0
                       transition duration-300 ease-out
                       group-hover:opacity-70 group-hover:translate-y-4 group-hover:scale-110"
          />

          <div
            className="relative w-full h-full overflow-hidden rounded-2xl transform-gpu
                       transition duration-300 ease-out
                       group-hover:-translate-y-1 group-hover:scale-[1.01]
                       group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            {!imgBroken ? (
              <img
                src={image}
                alt={name}
                className="absolute inset-0 w-full h-full object-cover select-none"
                onError={() => setImgBroken(true)}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                <ImageOff className="w-10 h-10 opacity-60" aria-hidden />
              </div>
            )}

            {/* Liquid-glass скидка */}
            {Number(discountPercent) > 0 && (
              <div className="absolute top-2 right-2">
                <div
                  className="relative w-10 h-10 rounded-full flex items-center justify-center select-none
                             text-[11px] font-semibold text-white/95
                             ring-1 ring-white/25 shadow-[0_6px_25px_rgba(0,0,0,0.5)]
                             overflow-hidden backdrop-blur-[14px]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(140,80,255,0.32) 0%, rgba(70,170,255,0.32) 100%)",
                    WebkitBackdropFilter: "blur(18px) saturate(180%)",
                    backdropFilter: "blur(18px) saturate(180%)",
                  }}
                  aria-label={`Скидка ${discountPercent}%`}
                  title={`Скидка ${discountPercent}%`}
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 35%, rgba(0,0,0,0.2) 100%)",
                      mixBlendMode: "overlay",
                    }}
                  />
                  <span
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>')",
                      backgroundSize: "cover",
                      mixBlendMode: "soft-light",
                    }}
                  />
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[45%] opacity-[0.25]"
                    style={{
                      background:
                        "radial-gradient(120% 80% at 50% 100%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.05) 80%)",
                      filter: "blur(8px)",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full ring-1 ring-white/40" />
                  <span
                    className="relative z-10 font-bold tracking-tight"
                    style={{
                      color: "rgba(255,255,255,0.98)",
                      textShadow:
                        "0 1px 3px rgba(0,0,0,0.75), 0 0 6px rgba(0,0,0,0.45), 0 0 10px rgba(255,255,255,0.35)",
                      filter: "drop-shadow(0 0 2px rgba(255,255,255,0.45))",
                    }}
                  >
                    −{discountPercent}%
                  </span>
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10" />
          </div>
        </a>

        {/* Текстовая часть */}
        <div className="p-3 select-none">
          <div className="flex flex-col h-[140px]">
            <h3
              className="text-white text-[20px] font-semibold leading-[1.25] line-clamp-2"
              title={name}
            >
              {name}
            </h3>

            <div className="mt-2 h-[1.5px] bg-gradient-to-r from-white/15 via-white/25 to-white/15 rounded-full" />

            {publisher ? (
              <div
                className="mt-2 text-white/80 text-[13px] leading-[1.4] truncate"
                title={publisher}
              >
                {publisher}
              </div>
            ) : (
              <div className="mt-2 h-[20px]" />
            )}

            <div className="mt-auto pt-2 flex items-baseline gap-2">
              {formattedPrice && (
                <span className="text-white/95 font-medium text-[16px] leading-[1.3]">
                  {formattedPrice}
                </span>
              )}
              {formattedOldPrice && (
                <span className="text-white/55 line-through text-[13px] leading-[1.3]">
                  {formattedOldPrice}
                </span>
              )}
            </div>
          </div>

          {/* Кнопка "В корзину" */}
          <button
            type="button"
            onClick={handleAdd}
            className="mt-4 w-full rounded-xl px-3 py-3 text-[15px] transition
                      border flex items-center justify-center gap-2
                      hover:opacity-95 cursor-pointer
                      backdrop-blur-xl bg-white/10 border-white/25"
            style={{
              background: `${THEME.accent}`,
              color: "#FFFFFF",
              borderColor: "transparent",
              cursor: "pointer",
            }}
            aria-label="Добавить в корзину"
          >
            {added ? "Добавлено" : loading ? "Добавляю..." : "В корзину"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
