import React, { useEffect, useMemo, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import EmptyState from "../../components/ui/EmptyState";
import {
  fetchGamesRaw,
  fetchGame,
  updateGame,
  updateGameGenres,
  updateGamePlatforms,
  fetchGenres,
  fetchPlatforms,
  createGame,
  uploadImageTo,
} from "../../services/games";
import {
  Gamepad2,
  ChevronDown,
  Image as ImageIcon,
  CalendarDays,
  Factory,
  Building2,
  BadgePercent,
  Tag,
  Layers,
  MonitorSmartphone,
  Clock,
  Star,
  PencilLine,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
} from "lucide-react";

// Локальный компонент уведомлений для AdminGamesPage
function Notification({ message, type, onClose }) {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertCircle size={20} />,
  };

  const colors = {
    success: "bg-green-500/90 border-green-400/50",
    error: "bg-red-500/90 border-red-400/50",
    info: "bg-blue-500/90 border-blue-400/50",
    warning: "bg-yellow-500/90 border-yellow-400/50",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md text-white shadow-lg min-w-[300px] max-w-[500px] ${colors[type]}`}
      style={{
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm">{message}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition"
      >
        <X size={16} />
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Хук для управления уведомлениями
function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    notify: {
      success: (msg) => addNotification(msg, "success"),
      error: (msg) => addNotification(msg, "error"),
      info: (msg) => addNotification(msg, "info"),
      warning: (msg) => addNotification(msg, "warning"),
    },
    removeNotification,
  };
}

// Утилиты форматирования
function fmt(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ru-RU");
  } catch {
    return String(dt);
  }
}

function toDateInputValue(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  } catch {
    return "";
  }
}

function rub(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

function listToText(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "—";
  return arr
    .map((v) =>
      typeof v === "string" ? v : v?.name || v?.title || v?.label || v?.id
    )
    .filter(Boolean)
    .join(", ");
}

function calcFinal(base, discount) {
  const price = Number(base || 0);
  const disc = Number(discount || 0);
  if (!disc) return price;
  if (disc > 0 && disc < 1) return Math.max(0, Math.round(price * (1 - disc)));
  if (disc > 1 && disc < 100)
    return Math.max(0, Math.round(price * (1 - disc / 100)));
  if (disc >= 100) return Math.max(0, price - disc);
  return price;
}

function avgRating(data) {
  if (Number.isFinite(data?.rating)) return Number(data.rating);
  const list = Array.isArray(data?.reviews)
    ? data.reviews
    : Array.isArray(data?.ratings)
    ? data.ratings
    : [];
  if (!list.length) return null;
  const nums = list
    .map((r) => Number(r?.rating ?? r?.score ?? r))
    .filter((x) => Number.isFinite(x));
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

function Modal({ open, onClose, children, title = "Диалог" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <Glass
        className="relative z-[1001] flex flex-col w-[90%] max-w-[1400px] h-[85%] overflow-hidden border border-white/10"
        style={{
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="px-3 py-1 rounded-md border border-white/20 hover:bg-white/10 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </Glass>
    </div>
  );
}

export default function AdminGamesPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState({});
  const [details, setDetails] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const { notifications, notify, removeNotification } = useNotifications();

  useEffect(() => {
    (async () => {
      setError("");
      try {
        const list = await fetchGamesRaw();
        setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        setError("Не удалось загрузить игры");
        setItems([]);
      }
    })();
  }, []);

  const hasData = useMemo(
    () => Array.isArray(items) && items.length > 0,
    [items]
  );

  async function toggleOpen(id) {
    setOpen((s) => ({ ...s, [id]: !s[id] }));
    if (!details[id]) {
      setDetails((s) => ({ ...s, [id]: { data: null, loading: true } }));
      try {
        const full = await fetchGame(id);
        setDetails((s) => ({
          ...s,
          [id]: { data: full || {}, loading: false },
        }));
      } catch {
        setDetails((s) => ({
          ...s,
          [id]: { data: {}, loading: false, error: true },
        }));
      }
    }
  }

  async function refreshRow(id) {
    try {
      const [rawList, full] = await Promise.all([
        fetchGamesRaw(),
        fetchGame(id),
      ]);
      setItems(Array.isArray(rawList) ? rawList : []);
      setDetails((s) => ({
        ...s,
        [id]: { data: full || {}, loading: false, error: false },
      }));
    } catch {}
  }

  return (
    <div className="text-white">
      {/* Контейнер уведомлений */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(({ id, message, type }) => (
          <div key={id} className="pointer-events-auto">
            <Notification
              message={message}
              type={type}
              onClose={() => removeNotification(id)}
            />
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Gamepad2 size={18} className="opacity-90" />
        <h2 className="text-lg font-semibold">Все игры</h2>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15"
          type="button"
        >
          <Plus size={16} />
          Добавить игру
        </button>
      </div>

      <Glass className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1080px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 w-[56px]"></th>
                <th className="px-4 py-3 w-[80px]">Обложка</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3 w-[160px]">Дата релиза</th>
                <th className="px-4 py-3 w-[120px]">ID</th>
                <th className="px-4 py-3 w-[160px]">Загружена</th>
                <th className="px-4 py-3 w-[160px]">Обновлена</th>
              </tr>
            </thead>
            <tbody>
              {items === null ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <div className="h-10 w-full bg-white/10 rounded-md animate-pulse" />
                  </td>
                </tr>
              ) : !hasData ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <EmptyState
                      title={error ? "Ошибка" : "Нет игр"}
                      subtitle={error || "Добавьте первую игру"}
                    />
                  </td>
                </tr>
              ) : (
                items.map((g) => {
                  const id = g.id;
                  const cover = g.cover_url || g.cover || g.image;
                  const name = g.title || g.name;
                  const release = g.release_date || g.releaseDate;
                  const created = g.created_at || g.createdAt;
                  const updated = g.updated_at || g.updatedAt;
                  const isOpen = !!open[id];
                  const d = details[id];

                  return (
                    <React.Fragment key={id}>
                      <tr className="border-b border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleOpen(id)}
                            className={
                              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all duration-200 " +
                              (isOpen ? "rotate-180" : "")
                            }
                            aria-label={isOpen ? "Свернуть" : "Развернуть"}
                            title={isOpen ? "Свернуть" : "Развернуть"}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {cover ? (
                            <img
                              src={cover}
                              alt="Обложка"
                              className="h-12 w-12 object-cover rounded-lg border border-white/10"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                              <ImageIcon size={16} className="opacity-60" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{name}</td>
                        <td className="px-4 py-3">{fmt(release)}</td>
                        <td className="px-4 py-3">{id}</td>
                        <td className="px-4 py-3">{fmt(created)}</td>
                        <td className="px-4 py-3">{fmt(updated)}</td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-white/[0.03]">
                          <td colSpan={7} className="px-4 py-4">
                            {!d || d.loading ? (
                              <div className="h-24 rounded-xl bg-white/10 animate-pulse" />
                            ) : d.error ? (
                              <div className="text-white/80">
                                Не удалось загрузить данные об игре.
                              </div>
                            ) : (
                              <GameEditor
                                data={d.data}
                                notify={notify}
                                onSaved={() => refreshRow(id)}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Glass>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Добавление игры"
      >
        <GameEditor
          isNew
          notify={notify}
          data={{
            id: null,
            title: "",
            screenshots: [],
            genres: [],
            platforms: [],
          }}
          onSaved={async () => {
            setShowCreate(false);
            const list = await fetchGamesRaw();
            setItems(Array.isArray(list) ? list : []);
          }}
        />
      </Modal>
    </div>
  );
}

function GameEditor({ data, onSaved, isNew = false, notify }) {
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [platforms, setPlatforms] = useState([]);

  const [form, setForm] = useState(() => ({
    title: data.title || "",
    description: data.description || "",
    developer: data.developer || "",
    publisher: data.publisher || "",
    release_date: toDateInputValue(data.release_date),
    age_rating: data.age_rating || "",
    base_price: data.base_price ?? "",
    discount_percent: data.discount_percent ?? "",
    cover_url: data.cover_url || "",
    screenshots: (Array.isArray(data.screenshots) ? data.screenshots : []).map(
      (s) => (typeof s === "string" ? s : s?.url || "")
    ),
    genreNames: Array.isArray(data.genres)
      ? data.genres
          .map((g) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean)
      : [],
    platformIds: Array.isArray(data.platforms)
      ? data.platforms.map((p) => p?.platform_id || p?.id).filter(Boolean)
      : [],
  }));

  useEffect(() => {
    (async () => {
      try {
        const [gs, ps] = await Promise.all([fetchGenres(), fetchPlatforms()]);
        setGenres(gs || []);
        setPlatforms(ps || []);
      } catch {
        setGenres([]);
        setPlatforms([]);
      }
    })();
  }, []);

  const finalPricePreview = (() => {
    const base = Number(form.base_price || 0);
    const disc = Number(form.discount_percent || 0);
    return calcFinal(base, disc);
  })();

  async function onSaveAll() {
    if (!form.title?.trim()) {
      notify.warning("Введите название игры");
      return;
    }

    setSaving(true);
    try {
      // 1. Скриншоты нормализуем в массив объектов {url, alt, order}
      const normalizedScreenshots = (form.screenshots || [])
        .filter(Boolean)
        .map((item, i) => {
          if (typeof item === "string") {
            return { url: item, alt: "", order: i };
          }
          return {
            url: item.url || item,
            alt: item.alt || "",
            order: Number.isFinite(item.order) ? item.order : i,
          };
        });

      // 2. Основные поля игры (таблица games)
      const payloadGame = {
        title: form.title || null,
        description: form.description || null,
        developer: form.developer || null,
        publisher: form.publisher || null,
        release_date: form.release_date || null,
        age_rating: form.age_rating || null,
        base_price: form.base_price === "" ? null : Number(form.base_price),
        discount_percent:
          form.discount_percent === "" ? null : Number(form.discount_percent),
        cover_url: form.cover_url || null,
        screenshots: normalizedScreenshots,
      };

      // 3. Жанры: сервер ждёт имена жанров
      const selectedGenreNames = Array.isArray(form.genreNames)
        ? form.genreNames.filter(Boolean)
        : [];

      // 4. Платформы: сервер ждёт массив числовых ID платформ
      const selectedPlatformIds = Array.isArray(form.platformIds)
        ? form.platformIds
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n))
        : [];

      let gameId;

      if (isNew) {
        // === СОЗДАНИЕ НОВОЙ ИГРЫ ===
        // ВАЖНО: сюда сразу добавляем platform_ids,
        // чтобы GamesController.create сразу создал строки в game_platforms
        const created = await createGame({
          ...payloadGame,
          platform_ids: selectedPlatformIds,
        });

        gameId = created?.id;
        if (!gameId) {
          throw new Error("Игра не создана: нет id от сервера.");
        }

        // доп. синхронизация жанров (если это отдельный механизм у тебя)
        if (selectedGenreNames.length) {
          await updateGameGenres(gameId, {
            genreNames: selectedGenreNames,
          });
        }

        // на случай, если createGame НЕ создаёт связи платформ
        // (или ты хочешь их перезаписать гарантированно):
        await updateGamePlatforms(gameId, {
          platformIds: selectedPlatformIds,
        });
      } else {
        // === ОБНОВЛЕНИЕ СУЩЕСТВУЮЩЕЙ ИГРЫ ===
        gameId = data.id;

        // обновляем саму игру
        await updateGame(gameId, payloadGame);

        // жанры
        await updateGameGenres(gameId, {
          genreNames: selectedGenreNames,
        });

        // ПЛАТФОРМЫ (главное!)
        await updateGamePlatforms(gameId, {
          platformIds: selectedPlatformIds,
        });
      }

      notify.success("Изменения успешно сохранены!");

      if (typeof onSaved === "function") onSaved();
      setEditing(false);
    } catch (e) {
      console.error("Save error:", e);
      notify.error("Не удалось сохранить изменения: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function normalizeShots(arr) {
    const base = Array.isArray(arr) ? arr : [];
    return base.map((x, i) =>
      typeof x === "string"
        ? { alt: "", url: x, order: i }
        : {
            alt: x.alt || "",
            url: x.url || "",
            order: Number.isFinite(x.order) ? x.order : i,
          }
    );
  }

  async function handlePickCover(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadImageTo("covers", file); // Загрузка в папку covers
      console.log("Cover uploaded:", url);
      setForm((prev) => ({ ...prev, cover_url: url }));
      notify.info(
        "Обложка загружена. Нажмите 'Сохранить' для применения изменений."
      );
    } catch (err) {
      console.error("Cover upload error:", err);
      notify.error("Не удалось загрузить обложку: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleRemoveCover() {
    setForm((s) => ({ ...s, cover_url: "" }));
  }

  async function handlePickScreens(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const { url } = await uploadImageTo("screens", f); // Загрузка в папку screens
        console.log("Screenshot uploaded:", url);
        uploaded.push(url);
      }
      setForm((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, ...uploaded],
      }));
      notify.info(
        `Загружено ${uploaded.length} скриншот(ов). Нажмите 'Сохранить' для применения.`
      );
    } catch (err) {
      console.error("Screenshots upload error:", err);
      notify.error("Не удалось загрузить скриншоты: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleRemoveScreen(index) {
    setForm((s) => {
      const next = normalizeShots(s.screenshots).filter((_, i) => i !== index);
      next.forEach((it, i) => (it.order = i));
      return { ...s, screenshots: next.map((x) => x.url) };
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Glass className="p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">
            {data.title || "Без названия"}
          </h3>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-50"
                  onClick={onSaveAll}
                  disabled={saving || uploading}
                  title="Сохранить изменения"
                  type="button"
                >
                  <Save size={16} />
                  {saving
                    ? "Сохранение…"
                    : uploading
                    ? "Загрузка…"
                    : "Сохранить"}
                </button>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15"
                  onClick={() => setEditing(false)}
                  title="Отмена"
                  type="button"
                >
                  <X size={16} />
                  Отмена
                </button>
              </>
            ) : (
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15"
                onClick={() => setEditing(true)}
                title="Редактировать"
                type="button"
              >
                <PencilLine size={16} />
                Редактировать
              </button>
            )}
          </div>
        </div>

        {!editing ? (
          <>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap mb-3">
              {data.description || "Описание не указано."}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow
                icon={Factory}
                label="Разработчик"
                value={data.developer || "—"}
              />
              <InfoRow
                icon={Building2}
                label="Издатель"
                value={data.publisher || "—"}
              />
              <InfoRow
                icon={CalendarDays}
                label="Дата релиза"
                value={fmt(data.release_date)}
              />
              <InfoRow
                icon={Tag}
                label="Базовая цена"
                value={rub(data.base_price)}
              />
              <InfoRow
                icon={BadgePercent}
                label="Скидка"
                value={String(data.discount_percent || 0)}
              />
              <InfoRow
                icon={Tag}
                label="Цена со скидкой"
                value={rub(data.price_final ?? data.price)}
              />
              <InfoRow
                icon={Layers}
                label="Жанры"
                value={listToText(data.genres)}
              />
              <InfoRow
                icon={MonitorSmartphone}
                label="Платформы"
                value={listToText(
                  (data.platforms || []).map((p) => p.platform || p.name)
                )}
              />
              <InfoRow
                icon={Clock}
                label="Загружена"
                value={fmt(data.created_at)}
              />
              <InfoRow
                icon={Clock}
                label="Обновлена"
                value={fmt(data.updated_at)}
              />
              <InfoRow
                icon={Star}
                label="Рейтинг"
                value={avgRating(data) == null ? "—" : `${avgRating(data)} / 5`}
              />
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Название">
                <input
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.title}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, title: e.target.value }))
                  }
                />
              </Field>
              <Field label="Разработчик">
                <input
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.developer}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, developer: e.target.value }))
                  }
                />
              </Field>
              <Field label="Издатель">
                <input
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.publisher}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, publisher: e.target.value }))
                  }
                />
              </Field>
              <Field label="Дата релиза">
                <input
                  type="date"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.release_date}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, release_date: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Описание">
              <textarea
                rows={5}
                className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                value={form.description}
                onChange={(e) =>
                  setForm((s) => ({ ...s, description: e.target.value }))
                }
              />
            </Field>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Возрастной рейтинг">
                <input
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.age_rating}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, age_rating: e.target.value }))
                  }
                />
              </Field>
              <Field label="Базовая цена">
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.base_price}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, base_price: e.target.value }))
                  }
                />
              </Field>
              <Field label="Скидка (% или доля)">
                <input
                  type="number"
                  inputMode="numeric"
                  step="0.01"
                  className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30"
                  value={form.discount_percent}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, discount_percent: e.target.value }))
                  }
                />
              </Field>
              <Field label="Цена со скидкой (превью)">
                <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/20">
                  {rub(finalPricePreview)}
                </div>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Обложка">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                    {form.cover_url ? (
                      <img
                        src={form.cover_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs opacity-70">нет</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePickCover}
                        disabled={uploading}
                      />
                      {uploading ? "Загрузка…" : "Выбрать файл"}
                    </label>

                    {form.cover_url && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                        onClick={handleRemoveCover}
                        disabled={uploading}
                      >
                        Убрать
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <div className="flex items-end">
                {form.cover_url ? (
                  <img
                    src={form.cover_url}
                    alt=""
                    className="h-16 w-16 object-cover rounded-lg border border-white/10"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                    <ImageIcon size={16} className="opacity-60" />
                  </div>
                )}
              </div>
            </div>

            <Field label="Скриншоты">
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePickScreens}
                    disabled={uploading}
                  />
                  {uploading ? "Загрузка…" : "Добавить файлы"}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(normalizeShots(form.screenshots) || []).map((shot, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={shot.url}
                        alt={shot.alt || ""}
                        className="h-28 w-full object-cover rounded-md border border-white/10"
                      />
                      <button
                        type="button"
                        title="Удалить"
                        onClick={() => handleRemoveScreen(i)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition px-2 py-1 text-xs rounded-md border border-white/20 bg-black/50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {!form.screenshots?.length && (
                    <div className="text-sm opacity-70 col-span-full">
                      Скриншоты не добавлены
                    </div>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Жанры">
                <div className="grid grid-cols-2 gap-2">
                  {genres.map((g) => {
                    const checked = form.genreNames.includes(g.name);
                    return (
                      <label key={g.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-white"
                          checked={checked}
                          onChange={(e) => {
                            setForm((s) => {
                              const set = new Set(s.genreNames);
                              if (e.target.checked) set.add(g.name);
                              else set.delete(g.name);
                              return { ...s, genreNames: Array.from(set) };
                            });
                          }}
                        />
                        <span>{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>

              <Field label="Платформы">
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((p) => {
                    const id = p.id ?? p.platform_id;
                    const checked = form.platformIds.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="accent-white"
                          checked={checked}
                          onChange={(e) => {
                            setForm((s) => {
                              const set = new Set(s.platformIds);
                              if (e.target.checked) set.add(id);
                              else set.delete(id);
                              return { ...s, platformIds: Array.from(set) };
                            });
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>

            <div className="text-xs text-white/70 -mt-1">
              💾 <strong>Важно:</strong> После загрузки изображений обязательно
              нажмите кнопку "Сохранить" для применения всех изменений (поля +
              жанры/платформы + изображения).
            </div>
          </div>
        )}
      </Glass>

      <Glass className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={16} className="opacity-90" />
          <div className="font-medium">
            {editing ? "Скриншоты (превью)" : "Скриншоты"}
          </div>
        </div>
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            {form.screenshots
              .filter(Boolean)
              .slice(0, 6)
              .map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-full h-24 object-cover rounded-lg border border-white/10"
                />
              ))}
          </div>
        ) : Array.isArray(data.screenshots) && data.screenshots.length ? (
          <div className="grid grid-cols-2 gap-2">
            {data.screenshots.slice(0, 6).map((s, i) => (
              <img
                key={i}
                src={typeof s === "string" ? s : s?.url || ""}
                alt={s?.alt || ""}
                className="w-full h-24 object-cover rounded-lg border border-white/10"
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/70">Нет скриншотов.</div>
        )}
      </Glass>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="opacity-80" />
      <div className="text-white/70">{label}:</div>
      <div className="text-white/95 truncate">{value}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-white/70 text-xs mb-1">{label}</div>
      {children}
    </div>
  );
}
