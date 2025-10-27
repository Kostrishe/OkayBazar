import { apiFetch } from "../lib/api";

/**
 * Вспомогательная функция для извлечения массива из разных форматов ответа.
 */
function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.items && Array.isArray(payload.items)) return payload.items;
  if (payload?.rows && Array.isArray(payload.rows)) return payload.rows;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
}

function safeGetLS(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readAllLocalStorage() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
  } catch {
    // игнорируем ошибки доступа к localStorage
  }
  return out;
}

/**
 * Декодирование JWT payload из base64url в JSON.
 */
function b64urlToJson(b64) {
  try {
    const s = decodeURIComponent(
      atob(b64.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Извлечь user_id из любого объекта (поддерживает разные форматы).
 */
function extractIdFromAny(obj) {
  if (!obj || typeof obj !== "object") return null;
  const candidates = [
    obj.id,
    obj.user_id,
    obj.userId,
    obj.uid,
    obj.sub,
    obj.user?.id,
    obj.user?.user_id,
    obj.user?.userId,
  ];
  return candidates.find((v) => v != null) ?? null;
}

/**
 * Попытаться получить токен из любых часто-используемых ключей localStorage.
 */
function getAnyToken() {
  const keys = [
    "token",
    "accessToken",
    "jwt",
    "auth_token",
    "authorization",
    "bearer",
  ];
  for (const k of keys) {
    const v = safeGetLS(k);
    if (v) return v.replace(/^Bearer\s+/i, "");
  }
  return "";
}

/**
 * Извлечь user_id из разных источников:
 * 1) /auth/me (если apiFetch подставит Authorization — идеально)
 * 2) JWT из любых ключей localStorage
 * 3) Любые JSON-профили в localStorage
 * 4) window.* (если приложение что-то клало глобально)
 */
async function resolveUserId() {
  // 1) /auth/me
  try {
    const me = await apiFetch(`/auth/me`);
    const id = extractIdFromAny(me);
    if (id != null) return Number(id) || id;
  } catch {
    // игнорируем ошибку
  }

  // 2) JWT из любых ключей localStorage
  const anyToken = getAnyToken();
  if (anyToken && anyToken.includes(".")) {
    const [, payload] = anyToken.split(".");
    const data = b64urlToJson(payload) || {};
    const id = extractIdFromAny(data);
    if (id != null) return Number(id) || id;
  }

  // 3) Любые JSON-профили в localStorage
  const all = readAllLocalStorage();
  for (const [, v] of Object.entries(all)) {
    // пропустим длинные бинарные и счётчики
    if (!v || v.length > 5000) continue;
    try {
      const j = JSON.parse(v);
      const id = extractIdFromAny(j);
      if (id != null) return Number(id) || id;
    } catch {
      // не JSON
    }
  }

  // 4) window.* (если приложение что-то клало глобально)
  try {
    const g = window || {};
    const id =
      extractIdFromAny(g.auth) ||
      extractIdFromAny(g.user) ||
      extractIdFromAny(g.currentUser);
    if (id != null) return Number(id) || id;
  } catch {
    // игнорируем ошибку
  }

  return null;
}

/**
 * Получить отзывы для игры по game_id.
 * Пробует несколько вариантов эндпоинтов.
 */
export async function fetchReviewsByGame(gameId) {
  const gid = Number(gameId);
  const attempts = [
    `/reviews?game_id=${gid || gameId}`,
    `/reviews?game=${gid || gameId}`,
    `/reviews/by-game/${gid || gameId}`,
  ];
  for (const url of attempts) {
    try {
      const resp = await apiFetch(url);
      let arr = pickArray(resp);
      // если в ответе есть game_id, фильтруем только по нужной игре
      if (arr.length && arr.some((r) => r?.game_id != null)) {
        arr = arr.filter((r) => String(r.game_id) === String(gid || gameId));
      }
      return arr;
    } catch {
      // пробуем следующий эндпоинт
    }
  }
  return [];
}

/**
 * Создать отзыв.
 * Отправляем все алиасы полей (snake + camel), чтобы совпасть с ожиданиями бэка.
 * @param {object} params - Параметры отзыва
 * @param {number} params.game_id - ID игры
 * @param {number} params.rating - Оценка (1-5)
 * @param {string} params.body - Текст отзыва
 */
export async function createReview({ game_id, rating, body }) {
  const gid = Number(game_id);
  const r = Math.min(Math.max(Number(rating || 0), 1), 5);
  const cleanBody = String(body || "").trim();

  if (!Number.isFinite(gid) || !Number.isFinite(r)) {
    const err = new Error("bad_payload");
    err.code = 400;
    throw err;
  }

  const user_id = await resolveUserId();
  if (user_id == null) {
    const err = new Error("auth_required");
    err.code = 401;
    throw err;
  }

  const payload = {
    user_id,
    userId: user_id,
    game_id: gid,
    gameId: gid,
    rating: r,
    body: cleanBody,
  };

  return apiFetch(`/reviews`, { method: "POST", body: payload });
}