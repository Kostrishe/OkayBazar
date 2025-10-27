const API = import.meta.env?.VITE_API_URL || "/api";

/**
 * Получить заголовки авторизации из localStorage (если токен есть).
 */
function authHeaders() {
  try {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

/**
 * Универсальная функция для запросов к API.
 */
async function request(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers || {}),
    },
    credentials: "include",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.status === 204 ? null : res.json();
}

/**
 * Вспомогательная функция для извлечения счётчика из разных форматов ответа.
 */
function extractCount(payload) {
  if (!payload) return 0;
  if (typeof payload.total === "number") return payload.total;
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.items)) return payload.items.length;
  if (typeof payload.count === "number") return payload.count;
  if (payload.data) return extractCount(payload.data);
  return 0;
}

/**
 * Получить количество пользователей (для статистики админки).
 */
export async function countUsers() {
  const data = await request(`${API}/users`);
  return extractCount(data);
}

/**
 * Получить количество игр (для статистики админки).
 */
export async function countGames() {
  const data = await request(`${API}/games`);
  return extractCount(data);
}

/**
 * Получить количество заказов (для статистики админки).
 */
export async function countOrders() {
  const data = await request(`${API}/orders`);
  return extractCount(data);
}

/**
 * Запустить синхронизацию данных (кнопка в админке).
 * Пробует несколько возможных эндпоинтов.
 */
export async function triggerSync() {
  const candidates = [
    `${API}/admin/sync`,
    `${API}/admin/refresh-prices`,
    `${API}/games/sync`,
  ];
  let lastErr;

  for (const url of candidates) {
    try {
      return await request(url, { method: "POST" });
    } catch {
      // если ничего не сработало — выбрасываем последнюю ошибку
      throw lastErr ?? new Error("Не удалось выполнить синхронизацию");
    }
  }

  // имитация успешной синхры, если ничего не найдено
  await new Promise((r) => setTimeout(r, 800));
  return { success: true, message: "Mock sync complete" };
}

/**
 * Получить информацию о портах (заглушка для админки).
 */
export async function getAdminInfo() {
  return {
    backendPort: 3001,
    frontendPort: 5173,
  };
}

/**
 * Получить список таблиц БД (заглушка для админки).
 */
export async function getDbTables() {
  return [
    "game_genres",
    "game_platforms",
    "games",
    "genres",
    "order_items",
    "orders",
    "payments",
    "platforms",
    "reviews",
    "users",
  ];
}