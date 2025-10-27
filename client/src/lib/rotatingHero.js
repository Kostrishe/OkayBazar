import { fetchRandomGames } from "../services/games";

const HERO_CACHE_KEY = "okbazar.hero.v4";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Формат цены как в карточке: целые ₽ с разделителями
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

/**
 * Получение слайдов для героя главной страницы.
 * Кеширует на неделю, предпочитает игры с картинками.
 */
export async function getRotatingHeroSlides() {
  const now = Date.now();
  const cached = readCache();

  // если кеш валиден на протяжении недели и у слайдов есть картинки — используем его
  if (isFresh(cached, now) && hasImages(cached.slides)) {
    return cached.slides;
  }

  // иначе берём новые случайные игры и кладём в кеш на неделю
  try {
    const rnd = await fetchRandomGames(24);
    const slides = gamesToSlides(pick3PreferWithImages(rnd));
    if (slides.length === 3) {
      writeCache({ ts: now, slides });
      return slides;
    }
  } catch {
    // тихо игнорируем ошибку
  }

  // если не получилось — вернём что было в кеше (даже если просрочен), либо заглушки
  if (cached?.slides?.length) return cached.slides;

  return [
    {
      id: null,
      slug: null,
      title: "Игра",
      subtitle: "",
      cta: "Подробнее",
      image: "",
      badge: "Выбор OkayBazar",
    },
    {
      id: null,
      slug: null,
      title: "Игра",
      subtitle: "",
      cta: "Подробнее",
      image: "",
      badge: "Выбор OkayBazar",
    },
    {
      id: null,
      slug: null,
      title: "Игра",
      subtitle: "",
      cta: "Подробнее",
      image: "",
      badge: "Выбор OkayBazar",
    },
  ];
}

/**
 * Преобразование игр в слайды для героя
 */
function gamesToSlides(games) {
  return (games || []).slice(0, 3).map((g) => ({
    id: g?.id ?? null,
    slug: g?.slug ?? null,
    title: g?.name || "Игра",
    subtitle: g?.price ? `Всего за ${formatRubNoCoins(g.price)}` : "",
    cta: "Подробнее",
    image: g?.image || "",
    badge: g?.tag || "Выбор OkayBazar",
  }));
}

/**
 * Выбор 3 игр с приоритетом для игр с картинками
 */
function pick3PreferWithImages(list = []) {
  if (!Array.isArray(list)) return [];
  const withImg = [];
  const noImg = [];
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  shuffled.forEach((g) => (g?.image ? withImg.push(g) : noImg.push(g)));
  return [...withImg, ...noImg].slice(0, 3);
}

function isFresh(cached, now) {
  return (
    cached && Array.isArray(cached.slides) && now - cached.ts < ONE_WEEK_MS
  );
}

function hasImages(slides) {
  return (
    Array.isArray(slides) &&
    slides.length === 3 &&
    slides.every((s) => !!s?.image)
  );
}

function readCache() {
  try {
    const raw = localStorage.getItem(HERO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(obj) {
  try {
    localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // тихо игнорируем ошибку записи в localStorage
  }
}