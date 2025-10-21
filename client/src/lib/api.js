const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const listeners = new Set();
export function onUnauthorized(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emitUnauthorized() {
  for (const cb of listeners) {
    try { cb(); } catch (e) { void e; }
  }
}

export async function apiFetch(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let text = "";
  try { text = await res.text(); } catch (e) { void e; }

  if (!res.ok) {
    if (res.status === 401) emitUnauthorized();
    try {
      const json = text && JSON.parse(text);
      throw new Error(json?.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? (text ? JSON.parse(text) : null) : text;
}

export function resolveImage(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  return `${base}/${src.replace(/^\/+/, "")}`;
}

export const priceBus = new EventTarget();

export function onPricesUpdated(cb) {
  const handler = (e) => cb?.(e.detail);
  priceBus.addEventListener("prices:update", handler);
  return () => priceBus.removeEventListener("prices:update", handler);
}

export function startPricesPolling({
  interval = 10000,
  limit = 32,
} = {}) {
  let timer = null;
  let stopped = false;

  async function tick() {
    try {
      const [pop, fresh] = await Promise.all([
        apiFetch(`/games?sort=popular&limit=${limit}`).catch(() => []),
        apiFetch(`/games?sort=new&limit=${Math.min(12, limit)}`).catch(() => []),
      ]);
      priceBus.dispatchEvent(
        new CustomEvent("prices:update", { detail: { pop, fresh, at: Date.now() } })
      );
    } catch (e) {
      console.error(e);
      alert("Не удалось обновить данные");
    }
    finally {
      if (!stopped) timer = setTimeout(tick, interval);
    }
  }

  tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}

export { API_URL };
