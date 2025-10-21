import React, { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Activity, Star, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Glass, GlassCard, Section } from "../components/ui/Glass";
import { fetchPopularGames, fetchNewReleases } from "../services/games";
import { getRotatingHeroSlides } from "../lib/rotatingHero";
import { resolveImage, startPricesPolling, onPricesUpdated } from "../lib/api";
import GameModal from "../components/GameModal";

import ProductCard from "../components/ProductCard";
import THEME from "../styles/theme";
import Background from "../components/ui/Background";

const STEAM_TOP_NOW = [
  {
    name: "Counter-Strike 2",
    image:
      "https://cdn.fastly.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg",
    concurrent: 965_432,
  },
  {
    name: "Dota 2",
    image:
      "https://business-portal-bucket.s3.amazonaws.com/media/images/41e172c318357d632f53b92d8cb38661_large_cover.original.jpg",
    concurrent: 702_118,
  },
  {
    name: "PUBG",
    image:
      "https://static0.xdaimages.com/wordpress/wp-content/uploads/2018/06/pubg.jpg?w=1200&h=675&fit=crop",
    concurrent: 441_905,
  },
];

const PROMOS = [
  {
    title: "Осенние скидки до −70%",
    desc: "Соберите библиотеку хитов по выгодным ценам.",
    image: "/images/promos/autumn-sale.jpg",
    cta: "К акциям",
  },
  {
    title: "Инди-витрина",
    desc: "Лучшее из независимых релизов.",
    image: "/images/promos/indie-game.jpg",
    cta: "Открыть",
  },
];

const REVIEWS = [
  {
    user: "Иван",
    text: "Молниеносная выдача ключей, приятный интерфейс. Купил и сразу начал играть.",
    rating: 5,
  },
  {
    user: "Анна",
    text: "Красивый сайт, всё понятно, хороший саппорт.",
    rating: 5,
  },
  { user: "Денис", text: "Нормальные цены, часто бывают скидки.", rating: 4 },
];

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'><rect width='100%' height='100%' fill='rgba(255,255,255,0.1)'/><text x='50%' y='50%' font-size='28' fill='%239AA5B1' text-anchor='middle' font-family='Arial'>Image not available</text></svg>";

/* ----------------------------------- Hero Slider ----------------------------------- */
function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [imgBroken, setImgBroken] = useState(false);

  // первичная загрузка — сразу свежие данные без кеша/задержек
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getRotatingHeroSlides();
        if (mounted && Array.isArray(s)) setSlides(s);
      } catch (e) {
        console.error("Hero load error:", e);
        if (mounted) setSlides([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // автопрокрутка
  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 20000);
    return () => clearInterval(t);
  }, [slides.length]);

  // сброс флага битой картинки при смене слайда
  useEffect(() => {
    setImgBroken(false);
  }, [index, slides]);

  const slide = slides[index];

  return (
    <Section>
      <div className="relative">
        <GlassCard>
          <div className="relative h-[360px] sm:h-[420px] md:h-[500px]">
            <AnimatePresence mode="wait">
              {slide?.image && !imgBroken ? (
                <motion.div
                  key={slide.image}
                  className="absolute inset-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src={slide.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-60"
                    onError={() => setImgBroken(true)}
                  />

                  <img
                    src={slide.image}
                    alt={slide.title ?? "Игра"}
                    className="
                      absolute inset-0 m-auto
                      max-h-full max-w-full
                      object-contain
                      drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]
                    "
                    onError={() => setImgBroken(true)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`ph_${index}`}
                  className="absolute inset-0 w-full h-full bg-white/10 flex items-center justify-center text-white/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  фото временно отсутствует
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-black/10 to-transparent" />
            <div className="absolute left-15 bottom-5 z-10 flex flex-col gap-4 max-w-lg">
              <div
                className="flex items-center justify-center text-white/100 text-[11.5px] uppercase tracking-wide font-medium rounded-full select-none shadow-[0_2px_12px_rgba(255,255,255,0.1)] border border-white/25 backdrop-blur-2xl"
                style={{
                  width: "150px",
                  height: "28px",
                  background: "rgba(255,255,255,0.12)",
                  boxShadow:
                    "0 4px 20px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                {slide?.badge || "Выбор OkayBazar"}
              </div>

              <div className="rounded-xl bg-black/40 backdrop-blur-md ring-1 ring-white/10 px-6 py-4 text-white shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                <h1 className="text-2xl sm:text-4xl font-semibold leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                  {slide?.title || "Игра"}
                </h1>
                {slide?.subtitle && (
                  <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {slide.subtitle}
                  </p>
                )}
              </div>

              {/* КНОПКА: ведёт в каталог */}
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white transition hover:opacity-95 border"
                style={{
                  backgroundColor: "#7C4DFF",
                  border: "transparent",
                  width: "160px",
                  height: "45px",
                  textAlign: "center",
                }}
              >
                {slide?.cta || "Подробнее"}
              </Link>
            </div>

            {slides.length > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between p-3">
                <button
                  onClick={() =>
                    setIndex((i) => (i - 1 + slides.length) % slides.length)
                  }
                  className="p-2 rounded-full bg-black/30 hover:bg-black/40 border border-white/30"
                  aria-label="Предыдущий"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % slides.length)}
                  className="p-2 rounded-full bg-black/30 hover:bg-black/40 border border-white/30"
                  aria-label="Следующий"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </Section>
  );
}

/* ------------------------- Скелетоны под сетки карточек ------------------------- */
function CardsSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden animate-pulse border border-white/20"
        >
          <div className="h-40 bg-white/10" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-9 bg-white/10 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- Popular ---------------------------------- */
function PopularGrid({ onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  // первичная загрузка
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchPopularGames(8);
        if (mounted) setItems(list);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить популярные игры");
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!items || !items.length) return;
    const off = onPricesUpdated((payload) => {
      const fresh = Array.isArray(payload?.pop?.items)
        ? payload.pop.items
        : payload?.pop || [];
      if (!fresh?.length) return;
      const idx = new Map(items.map((g, i) => [String(g.id ?? g.slug), i]));
      const updated = [...items];
      for (const g of fresh) {
        const key = String(g.id ?? g.slug);
        if (!idx.has(key)) continue;
        const i = idx.get(key);
        const price = Number(g.price ?? g.price_final ?? NaN);
        const base = Number(g.base_price ?? NaN);
        const dp = Number(g.discount_percent ?? 0);
        if (Number.isFinite(price))
          updated[i] = {
            ...updated[i],
            price: Math.round(price).toLocaleString("ru-RU") + " ₽",
            oldPrice:
              dp > 0 && Number.isFinite(base) && base > price
                ? Math.round(base).toLocaleString("ru-RU") + " ₽"
                : "",
            discountPercent: dp,
          };
      }
      setItems(updated);
    });
    return off;
  }, [items]);

  return (
    <Section title="Популярное" className="mt-8">
      {items === null ? (
        <CardsSkeleton count={8} />
      ) : items.length === 0 ? (
        <div className="text-white/70">{error || "Нет данных"}</div>
      ) : (
        <div
          id="catalog"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {items.map((g, i) => (
            <motion.div
              key={g.id || g.name || i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard {...g} onOpen={() => onOpen(g.id || g.slug)} />
            </motion.div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* -------------------------------- New Releases -------------------------------- */
function NewReleases({ onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchNewReleases(4);
        if (mounted) setItems(list);
      } catch (e) {
        console.error(e);
        setError("Не удалось загрузить новинки");
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!items || !items.length) return;
    const off = onPricesUpdated((payload) => {
      const fresh = Array.isArray(payload?.fresh?.items)
        ? payload.fresh.items
        : payload?.fresh || [];
      if (!fresh?.length) return;

      const idx = new Map(items.map((g, i) => [String(g.id ?? g.slug), i]));
      const updated = [...items];
      for (const g of fresh) {
        const key = String(g.id ?? g.slug);
        if (!idx.has(key)) continue;
        const price = Number(g.price ?? g.price_final ?? NaN);
        const base = Number(g.base_price ?? NaN);
        const dp = Number(g.discount_percent ?? 0);
        if (Number.isFinite(price))
          updated[idx.get(key)] = {
            ...updated[idx.get(key)],
            price: Math.round(price).toLocaleString("ru-RU") + " ₽",
            oldPrice:
              dp > 0 && Number.isFinite(base) && base > price
                ? Math.round(base).toLocaleString("ru-RU") + " ₽"
                : "",
            discountPercent: dp,
          };
      }
      setItems(updated);
    });
    return off;
  }, [items]);

  return (
    <Section title="Новинки" className="mt-8">
      {items === null ? (
        <CardsSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="text-white/70">{error || "Нет данных"}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((g, i) => (
            <motion.div
              key={g.id || g.name || i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard {...g} onOpen={() => onOpen(g.id || g.slug)} />
            </motion.div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ------------------------------- Steam Top Now ------------------------------- */
function SteamTopNow() {
  const max = Math.max(...STEAM_TOP_NOW.map((i) => i.concurrent));
  return (
    <Section
      title="Во что сейчас играет весь Steam?"
      className="mt-8"
      showLink={false}
    >
      <Glass className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEAM_TOP_NOW.map((item) => (
            <div key={item.name} className="flex gap-3 items-center">
              <div className="w-28 h-16 overflow-hidden rounded-xl border border-white/30">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold truncate text-white">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1 text-sm text-white">
                    <Activity className="w-4 h-4" />
                    {item.concurrent.toLocaleString("ru-RU")} онлайн
                  </div>
                </div>
                <div className="h-2 mt-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(item.concurrent / max) * 100}%`,
                      background: `linear-gradient(90deg, ${THEME.accent}, rgba(255,255,255,0.85))`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs mt-3 text-white/70">
          * Примерные фиксированные данные
        </div>
      </Glass>
    </Section>
  );
}

/* --------------------------------- Promotions --------------------------------- */
function Promotions() {
  return (
    <Section title="Акции и предложения" className="mt-10" showLink={false}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PROMOS.map((p) => (
          <Glass key={p.title} className="overflow-hidden">
            <div className="relative h-56">
              <img
                src={resolveImage(p.image)}
                alt={p.title}
                className="absolute inset-0 w-full h-full object-cover opacity-90"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMG;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
              <div className="absolute left-6 top-6 max-w-md">
                <h3 className="text-white text-2xl font-semibold drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">
                  {p.title}
                </h3>
                <p className="text-white/85 mt-1 max-w-md drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">
                  {p.desc}
                </p>
                <a
                  href="#"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-white/15 text-white border border-white/30 backdrop-blur-md hover:bg-white/20"
                >
                  {p.cta}
                </a>
              </div>
            </div>
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------ Reviews / Why Us ------------------------------ */
function Reviews() {
  return (
    <Section title="Отзывы / доверие" className="mt-10" showLink={false}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REVIEWS.map((r, i) => (
          <Glass key={i} className="p-5">
            <div className="flex items-center gap-2 text-white">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className="w-4 h-4"
                  style={{
                    fill: idx < r.rating ? "#FFFFFF" : "transparent",
                    color: "#FFFFFF",
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-white/85">“{r.text}”</p>
            <div className="mt-3 text-white/60 text-sm">— {r.user}</div>
          </Glass>
        ))}
      </div>
      <Glass className="p-5 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/90">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            Гарантированная выдача ключей
          </div>
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5" />
            Мгновенная доставка
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            Тысячи довольных игроков
          </div>
        </div>
      </Glass>
    </Section>
  );
}

function WhyUs() {
  const items = [
    {
      title: "Честные цены",
      text: "Работаем с официальными партнёрами и издателями.",
    },
    {
      title: "Мгновенная выдача",
      text: "Ключ приходит сразу после покупки — без ожиданий.",
    },
    {
      title: "Поддержка 24/7",
      text: "Быстро поможем с любыми вопросами по заказу.",
    },
    {
      title: "Безопасность",
      text: "Защита платежей и данных, шифрование и мониторинг.",
    },
  ];
  return (
    <Section title="Почему мы?" className="mt-10" showLink={false}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <Glass key={it.title} className="p-5">
            <h4 className="text-white/90 text-lg font-semibold">{it.title}</h4>
            <p className="text-white/70 mt-1">{it.text}</p>
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------- Page ----------------------------------- */
export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGameId, setModalGameId] = useState(null);

  const openGame = (idOrSlug) => {
    setModalGameId(idOrSlug);
    setModalOpen(true);
  };
  const closeGame = () => {
    setModalOpen(false);
    setModalGameId(null);
  };

  useEffect(() => {
    const stop = startPricesPolling({ interval: 10000, limit: 32 });
    return stop;
  }, []);

  return (
    <div className="min-h-screen font-sans text-white">
      <Background />
      <main className="space-y-2">
        <HeroSlider />
        <PopularGrid onOpen={openGame} />
        <NewReleases onOpen={openGame} />
        <SteamTopNow />
        <Promotions />
        <Reviews />
        <WhyUs />
      </main>

      {/* модалка карточки игры */}
      <GameModal
        open={modalOpen}
        gameIdOrSlug={modalGameId}
        onClose={closeGame}
      />
    </div>
  );
}
