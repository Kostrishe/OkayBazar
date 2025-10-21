import { apiFetch, resolveImage } from "../lib/api";

// --- утилиты парсинга ---
function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function formatRub(v) {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  const rub = Math.round(n);
  return rub.toLocaleString("ru-RU", {
    useGrouping: true,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }) + " ₽";
}

/* ===== НОРМАЛИЗАЦИЯ ИГРЫ ===== */
function mapGame(g) {
  const cover = g?.cover_url || g?.cover || g?.image || "";
  const screenshots = Array.isArray(g?.screenshots) ? g.screenshots : [];

  // добавляем поля с бэка
  const discountPercent = Number(g?.discount_percent ?? 0);
  const basePrice = g?.base_price;
  const finalPrice = g?.price ?? g?.price_rub ?? g?.cost;

  return {
    id: g?.id ?? g?._id ?? g?.game_id ?? g?.slug ?? String(Math.random()),
    name: g?.name ?? g?.title ?? "Без названия",
    publisher: g?.publisher ?? g?.developer ?? "",            // ← ВАЖНО: прокидываем
    price: formatRub(finalPrice),                              // финальная цена
    oldPrice:
      discountPercent > 0 && basePrice != null && Number(basePrice) > Number(finalPrice)
        ? formatRub(basePrice)
        : "",
    discountPercent,                                           // ← для бейджа
    image: resolveImage(cover),
    screenshots: screenshots.map((s) => ({
      alt: s.alt || "",
      url: resolveImage(s.url || ""),
      order: s.order ?? 0,
    })),
    tag: g?.tag ?? g?.badge ?? null,
  };
}



/* ===== СПРАВОЧНИКИ (ЖАНРЫ/ПЛАТФОРМЫ) ===== */
export async function fetchGenres() {
  const candidates = ["/genres", "/games/filters/genres", "/filters/genres"];
  for (const path of candidates) {
    try {
      const res = await apiFetch(path);
      const arr = pickArray(res);
      if (arr.length) {
        const list = arr
          .map((x) => {
            if (typeof x === "string") return { id: String(x), name: x };
            const id = x?.id ?? x?.genre_id ?? x?.value ?? x?.code;
            const name = x?.name ?? x?.title ?? x?.genre ?? x?.genre_ru;
            if (!name) return null;
            return { id: String(id ?? name), name };
          })
          .filter(Boolean);
        // console.log("[filters] genres:", list);
        return list;
      }
    } catch {}
  }
  return [];
}

export async function fetchPlatforms() {
  const candidates = ["/platforms", "/games/filters/platforms", "/filters/platforms"];
  for (const path of candidates) {
    try {
      const res = await apiFetch(path);
      const arr = pickArray(res);
      if (arr.length) {
        const list = arr
          .map((x) => {
            if (typeof x === "string") return { id: String(x), name: x };
            const id = x?.id ?? x?.platform_id ?? x?.value ?? x?.code;
            const name = x?.name ?? x?.title ?? x?.platform;
            if (!name) return null;
            return { id: String(id ?? name), name };
          })
          .filter(Boolean);
        // console.log("[filters] platforms:", list);
        return list;
      }
    } catch {}
  }
  return [];
}

/* ===== ОСНОВНАЯ ВЫБОРКА ДЛЯ КАТАЛОГА ===== */
/**
 * @param {Object} params
 *  - sort: 'name' | 'price_asc' | 'price_desc'
 *  - genreIds: (string|number)[]
 *  - platformIds: (string|number)[]
 *  - priceMin, priceMax: number|string
 *  - page, limit
 *  - genres, platforms: string[] (если бэк принимает названия)
 */
export async function fetchGames({
  sort = "name",
  genreIds = [],
  platformIds = [],
  priceMin = "",
  priceMax = "",
  page = 1,
  limit = 25,
  genres = [],
  platforms = [],
} = {}) {
  const qs = new URLSearchParams();

  // пагинация
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  // сортировка — отправляем в двух форматах на всякий
  qs.set("sort", sort); // name | price_asc | price_desc
  const order =
    sort === "name" ? "name_asc" :
    sort === "price_asc" ? "price_asc" :
    sort === "price_desc" ? "price_desc" : String(sort);
  qs.set("order", order);

  // приводим ID к числам (если это числа), иначе оставляем строки
  const gIds = (genreIds || []).map(v => (String(Number(v)) === String(v) ? Number(v) : String(v)));
  const pIds = (platformIds || []).map(v => (String(Number(v)) === String(v) ? Number(v) : String(v)));

  // жанры — и id, и имена
  if (gIds.length) {
    qs.set("genreIds", gIds.join(","));
    qs.set("genre_ids", gIds.join(",")); // альтернативный кейс
  }
  if (genres.length) qs.set("genres", genres.join(",")); // если API принимает имена

  // платформы — и id, и имена
  if (pIds.length) {
    qs.set("platformIds", pIds.join(","));
    qs.set("platform_ids", pIds.join(","));
  }
  if (platforms.length) qs.set("platforms", platforms.join(","));

  // цена — оба варианта ключей
  if (priceMin !== "" && priceMin != null) {
    qs.set("priceMin", String(priceMin));
    qs.set("min_price", String(priceMin));
  }
  if (priceMax !== "" && priceMax != null) {
    qs.set("priceMax", String(priceMax));
    qs.set("max_price", String(priceMax));
  }

  const url = `/games?${qs.toString()}`;
  console.log("[fetchGames]", url); // ← временно, для дебага
  const res = await apiFetch(url);
  return pickArray(res).map(mapGame);
}

/* ===== ДРУГИЕ ГОТОВЫЕ БЛОКИ (как были) ===== */
export async function fetchPopularGames(limit = 8) {
  try {
    const data = await apiFetch(`/games?sort=popular&limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  try {
    const data = await apiFetch(`/games/popular?limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  return [];
}

export async function fetchNewReleases(limit = 4) {
  try {
    const data = await apiFetch(`/games?sort=new&limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  try {
    const data = await apiFetch(`/games/new?limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  return [];
}

export async function fetchRandomGames(limit = 3) {
  try {
    const res = await apiFetch(`/games/random?limit=${limit}`);
    const arr = pickArray(res).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  try {
    const res = await apiFetch(`/games?sort=random&limit=${limit}`);
    const arr = pickArray(res).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {}
  return [];
}

export async function addToCart(gameId, qty = 1) {
  return apiFetch(`/cart`, { method: "POST", body: { gameId, quantity: qty } });
}

export async function fetchCart() {
  return apiFetch(`/cart`, { method: "GET" });
}

export const removeFromCart = (itemId) =>
  apiFetch(`/cart/${itemId}`, { method: "DELETE" });

export const clearCart = () => apiFetch("/cart", { method: "DELETE" });

function parseGameDetail(g) {
  if (!g) return null;
  const scrRaw = Array.isArray(g.screenshots) ? g.screenshots : [];
  const screenshots = scrRaw.map((s) =>
    typeof s === "string" ? { url: resolveImage(s), alt: "" } :
    { ...s, url: resolveImage(s.url || "") }
  );

  return {
    id: g.id,
    title: g.title || g.name || "Без названия",
    description: g.description || "",
    developer: g.developer || "",
    publisher: g.publisher || "",
    age_rating: g.age_rating || "",
    base_price: g.base_price ?? null,
    discount_percent: g.discount_percent ?? 0,
    price: g.price ?? g.price_final ?? null,
    price_final: g.price_final ?? g.price ?? null,
    cover_url: resolveImage(g.cover_url || ""),
    genres: Array.isArray(g.genres) ? g.genres : [],
    platforms: Array.isArray(g.platforms) ? g.platforms : [],
    screenshots,
  };
}

export async function fetchGame(idOrSlug) {
  const data = await apiFetch(`/games/${idOrSlug}`);
  return parseGameDetail(data);
}