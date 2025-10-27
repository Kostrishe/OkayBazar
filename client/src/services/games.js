import { apiFetch, resolveImage, API_URL } from "../lib/api";

/**
 * Вспомогательная функция для извлечения массива из разных форматов ответа API.
 */
function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

/**
 * Получить СЫРОЙ список игр для админки (с датами, как есть из бэка).
 */
export async function fetchGamesRaw({ page = 1, limit = 100, ...rest } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  for (const [k, v] of Object.entries(rest)) {
    if (v == null || v === "") continue;
    qs.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const res = await apiFetch(`/games?${qs.toString()}`);
  const items = Array.isArray(res?.items)
    ? res.items
    : Array.isArray(res)
    ? res
    : [];
  return items;
}

/**
 * Форматирование цены в рублях (целые, без копеек).
 */
function formatRub(v) {
  if (v == null || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  const rub = Math.round(n);
  return (
    rub.toLocaleString("ru-RU", {
      useGrouping: true,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }) + " ₽"
  );
}

/**
 * Нормализация объекта игры для фронтенда (карточки).
 * Преобразует разные форматы бэка в единый формат для ProductCard.
 */
function mapGame(g) {
  const cover = g?.cover_url || g?.cover || g?.image || "";
  const screenshots = Array.isArray(g?.screenshots) ? g.screenshots : [];

  const discountPercent = Number(g?.discount_percent ?? 0);
  const basePrice = g?.base_price;
  const finalPrice = g?.price ?? g?.price_rub ?? g?.cost;

  return {
    id: g?.id ?? g?._id ?? g?.game_id ?? g?.slug ?? String(Math.random()),
    name: g?.name ?? g?.title ?? "Без названия",
    publisher: g?.publisher ?? g?.developer ?? "",
    price: formatRub(finalPrice),
    oldPrice:
      discountPercent > 0 &&
      basePrice != null &&
      Number(basePrice) > Number(finalPrice)
        ? formatRub(basePrice)
        : "",
    discountPercent,
    image: resolveImage(cover),
    screenshots: screenshots.map((s) => ({
      alt: s.alt || "",
      url: resolveImage(s.url || ""),
      order: s.order ?? 0,
    })),
    tag: g?.tag ?? g?.badge ?? null,
  };
}

/**
 * Получить список жанров из разных возможных эндпоинтов.
 * Пробует несколько вариантов URL, возвращает первый успешный результат.
 */
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
        return list;
      }
    } catch {
      // пробуем следующий эндпоинт
    }
  }
  return [];
}

/**
 * Получить список платформ из разных возможных эндпоинтов.
 */
export async function fetchPlatforms() {
  const candidates = [
    "/platforms",
    "/games/filters/platforms",
    "/filters/platforms",
  ];
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
        return list;
      }
    } catch {
      // пробуем следующий эндпоинт
    }
  }
  return [];
}

/**
 * Основная выборка игр для каталога с фильтрами и сортировкой.
 * Поддерживает пагинацию, фильтры по жанрам/платформам/цене.
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

  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("sort", sort);

  // нормализуем сортировку для бэка
  const order =
    sort === "name"
      ? "name_asc"
      : sort === "price_asc"
      ? "price_asc"
      : sort === "price_desc"
      ? "price_desc"
      : String(sort);
  qs.set("order", order);

  // преобразуем ID в числа или строки в зависимости от формата
  const gIds = (genreIds || []).map((v) =>
    String(Number(v)) === String(v) ? Number(v) : String(v)
  );
  const pIds = (platformIds || []).map((v) =>
    String(Number(v)) === String(v) ? Number(v) : String(v)
  );

  if (gIds.length) {
    qs.set("genreIds", gIds.join(","));
    qs.set("genre_ids", gIds.join(","));
  }
  if (genres.length) qs.set("genres", genres.join(","));

  if (pIds.length) {
    qs.set("platformIds", pIds.join(","));
    qs.set("platform_ids", pIds.join(","));
  }
  if (platforms.length) qs.set("platforms", platforms.join(","));

  if (priceMin !== "" && priceMin != null) {
    qs.set("priceMin", String(priceMin));
    qs.set("min_price", String(priceMin));
  }
  if (priceMax !== "" && priceMax != null) {
    qs.set("priceMax", String(priceMax));
    qs.set("max_price", String(priceMax));
  }

  const url = `/games?${qs.toString()}`;
  const res = await apiFetch(url);
  return pickArray(res).map(mapGame);
}

/**
 * Получить популярные игры (пробует несколько эндпоинтов).
 */
export async function fetchPopularGames(limit = 8) {
  try {
    const data = await apiFetch(`/games?sort=popular&limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // пробуем альтернативный эндпоинт
  }
  try {
    const data = await apiFetch(`/games/popular?limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // тихо игнорируем
  }
  return [];
}

/**
 * Получить новые релизы.
 */
export async function fetchNewReleases(limit = 4) {
  try {
    const data = await apiFetch(`/games?sort=new&limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // пробуем альтернативный эндпоинт
  }
  try {
    const data = await apiFetch(`/games/new?limit=${limit}`);
    const arr = pickArray(data).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // тихо игнорируем
  }
  return [];
}

/**
 * Получить случайные игры (для героя главной страницы).
 */
export async function fetchRandomGames(limit = 3) {
  try {
    const res = await apiFetch(`/games/random?limit=${limit}`);
    const arr = pickArray(res).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // пробуем альтернативный эндпоинт
  }
  try {
    const res = await apiFetch(`/games?sort=random&limit=${limit}`);
    const arr = pickArray(res).map(mapGame);
    if (arr.length) return arr.slice(0, limit);
  } catch {
    // тихо игнорируем
  }
  return [];
}

/**
 * Добавить игру в корзину.
 */
export async function addToCart(gameId, qty = 1) {
  return apiFetch(`/cart`, { method: "POST", body: { gameId, quantity: qty } });
}

/**
 * Получить текущее состояние корзины пользователя.
 */
export async function fetchCart() {
  return apiFetch(`/cart`, { method: "GET" });
}

/**
 * Удалить товар из корзины по ID позиции.
 */
export const removeFromCart = (itemId) =>
  apiFetch(`/cart/${itemId}`, { method: "DELETE" });

/**
 * Очистить всю корзину.
 */
export const clearCart = () => apiFetch("/cart", { method: "DELETE" });

/**
 * Парсинг детальной информации об игре для модального окна.
 */
function parseGameDetail(g) {
  if (!g) return null;

  const scrRaw = Array.isArray(g.screenshots) ? g.screenshots : [];
  const screenshots = scrRaw.map((s) =>
    typeof s === "string"
      ? { url: resolveImage(s), alt: "" }
      : { ...s, url: resolveImage(s.url || ""), alt: s.alt || "" }
  );

  return {
    id: g.id ?? g.game_id ?? g.slug ?? null,
    title: g.title || g.name || "Без названия",
    description: g.description || g.desc || "",
    developer: g.developer || g.dev || "",
    publisher: g.publisher || "",
    age_rating: g.age_rating || g.esrb || g.pegi || "",

    base_price: g.base_price ?? null,
    discount_percent: g.discount_percent ?? 0,
    price: g.price ?? g.price_final ?? null,
    price_final: g.price_final ?? g.price ?? null,

    release_date: g.release_date || null,
    created_at: g.created_at || null,
    updated_at: g.updated_at || null,

    rating: g.rating || null,
    reviews: g.reviews || [],

    cover_url: resolveImage(g.cover_url || ""),
    genres: g.genres || [],
    platforms: g.platforms || [],
    screenshots,
  };
}

/**
 * Получить детальную информацию об игре по ID или slug.
 */
export async function fetchGame(idOrSlug) {
  const data = await apiFetch(`/games/${idOrSlug}`);
  return parseGameDetail(data);
}

/**
 * Обновить данные игры (админка).
 */
export async function updateGame(id, payload) {
  return apiFetch(`/games/${id}`, { method: "PUT", body: payload });
}

/**
 * Обновить жанры игры (админка).
 */
export async function updateGameGenres(
  id,
  { genreIds = [], genreNames = [] } = {}
) {
  const body = {};
  if (genreIds.length) body.genre_ids = genreIds;
  if (genreNames.length) body.genre_names = genreNames;
  return apiFetch(`/games/${id}/genres`, { method: "PUT", body });
}

/**
 * Обновить платформы игры (админка).
 */
export async function updateGamePlatforms(id, { platformIds = [] } = {}) {
  const body = { platform_ids: platformIds };
  return apiFetch(`/games/${id}/platforms`, { method: "PUT", body });
}

/**
 * Создать новую игру (админка).
 */
export async function createGame(payload) {
  return apiFetch(`/games`, { method: "POST", body: payload });
}

/**
 * Единственная функция загрузки изображений на сервер.
 * Загружает файл в указанную папку (covers или screens).
 * @param {string} folder - "covers" или "screens"
 * @param {File} file - файл изображения
 * @returns {Promise<{url: string, rel: string}>} - URL и относительный путь
 */
export async function uploadImageTo(folder, file) {
  const formData = new FormData();
  formData.append("file", file);

  // используем API_URL напрямую, так как это multipart/form-data
  const res = await fetch(`${API_URL}/media/upload?folder=${folder}`, {
    method: "POST",
    credentials: "include",
    body: formData, // НЕ указываем Content-Type - браузер сам установит с boundary
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Ошибка загрузки: HTTP ${res.status}`);
  }

  return res.json();
}