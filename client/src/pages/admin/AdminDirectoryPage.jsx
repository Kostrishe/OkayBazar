import React, { useEffect, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import EmptyState from "../../components/ui/EmptyState";
import { Plus, Trash2, Layers, MonitorSmartphone, X, Save } from "lucide-react";

import {
  fetchGenres,
  fetchPlatforms,
  addGenre,
  addPlatform,
  removeGenre,
  removePlatform,
} from "../../services/directory";

// =======================
// ЛОКАЛЬНЫЙ КОМПОНЕНТ МОДАЛКИ
// =======================
function DirectoryModal({
  open,
  onClose,
  title = "Добавить",
  label = "Название",
  placeholder = "Введите значение...",
  onSubmit, // async (value) => {}
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // сбрасываем поле при повторном открытии
  useEffect(() => {
    if (open) {
      setValue("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    const name = value.trim();
    if (!name) return;
    try {
      setSaving(true);
      await onSubmit(name);
      onClose();
    } catch (err) {
      alert("Ошибка: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* затемнение + блюр фона */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* стеклянная карточка */}
      <Glass
        className="relative z-[1001] w-[90%] max-w-[400px] overflow-hidden border border-white/10"
        style={{
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-md border border-white/20 bg-white/10 hover:bg-white/15 transition text-sm"
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-white/70 text-xs mb-1">{label}</div>
            <input
              className="w-full rounded-xl px-3 py-2 bg-white/15 text-white border border-white/30 text-sm outline-none focus:ring-2 focus:ring-[rgba(124,77,255,0.35)]"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="text-[11px] leading-snug text-white/50">
            Это значение появится в фильтрах каталога и в карточках игр.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-sm"
            disabled={saving}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </Glass>
    </div>
  );
}

// =======================
// ОСНОВНАЯ СТРАНИЦА
// =======================
export default function AdminDirectoryPage() {
  const [genres, setGenres] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  // стейты для открытия модалок
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [g, p] = await Promise.all([fetchGenres(), fetchPlatforms()]);
        setGenres(g || []);
        setPlatforms(p || []);
      } catch (err) {
        console.error("Ошибка загрузки справочников:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createGenre(name) {
    const res = await addGenre(name);
    if (res?.id) {
      setGenres((prev) => [...prev, res]);
    } else {
      alert("Такой жанр уже существует");
    }
  }

  async function createPlatform(name) {
    const res = await addPlatform(name);
    if (res?.id) {
      setPlatforms((prev) => [...prev, res]);
    } else {
      alert("Такая платформа уже существует");
    }
  }

  async function handleRemoveGenre(id) {
    if (!window.confirm("Удалить жанр?")) return;
    try {
      await removeGenre(id);
      setGenres((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Не удалось удалить жанр.");
    }
  }

  async function handleRemovePlatform(id) {
    if (!window.confirm("Удалить платформу?")) return;
    try {
      await removePlatform(id);
      setPlatforms((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert("Не удалось удалить платформу.");
    }
  }

  const loadingRow = (
    <tr>
      <td colSpan={3} className="px-4 py-4">
        <div className="h-8 w-full bg-white/10 rounded-md animate-pulse" />
      </td>
    </tr>
  );

  return (
    <div className="text-white space-y-10">
      {/* ===== ЖАНРЫ ===== */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layers size={18} className="opacity-90" />
          <h2 className="text-lg font-semibold">Жанры</h2>
        </div>

        <div className="mb-3">
          <button
            onClick={() => setShowGenreModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
          >
            <Plus size={16} />
            Добавить жанр
          </button>
        </div>

        <Glass className="p-0 overflow-hidden">
          <table className="min-w-[500px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 w-[80px] text-center">ID</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3 w-[80px] text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                loadingRow
              ) : genres.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6">
                    <EmptyState
                      title="Нет жанров"
                      subtitle="Добавьте первый жанр для каталога"
                    />
                  </td>
                </tr>
              ) : (
                genres.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-3 text-center text-white/70">
                      {g.id}
                    </td>
                    <td className="px-4 py-3">{g.name}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveGenre(g.id)}
                        className="inline-flex items-center justify-center text-red-400 hover:text-red-500 transition"
                        title="Удалить жанр"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Glass>
      </div>

      {/* ===== ПЛАТФОРМЫ ===== */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <MonitorSmartphone size={18} className="opacity-90" />
          <h2 className="text-lg font-semibold">Платформы</h2>
        </div>

        <div className="mb-3">
          <button
            onClick={() => setShowPlatformModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
          >
            <Plus size={16} />
            Добавить платформу
          </button>
        </div>

        <Glass className="p-0 overflow-hidden">
          <table className="min-w-[500px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 w-[80px] text-center">ID</th>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3 w-[80px] text-center">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                loadingRow
              ) : platforms.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6">
                    <EmptyState
                      title="Нет платформ"
                      subtitle="Добавьте первую платформу"
                    />
                  </td>
                </tr>
              ) : (
                platforms.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-3 text-center text-white/70">
                      {p.id}
                    </td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemovePlatform(p.id)}
                        className="inline-flex items-center justify-center text-red-400 hover:text-red-500 transition"
                        title="Удалить платформу"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Glass>
      </div>

      {/* ===== МОДАЛКИ (добавление жанра / платформы) ===== */}
      <DirectoryModal
        open={showGenreModal}
        onClose={() => setShowGenreModal(false)}
        title="Добавить жанр"
        label="Название жанра"
        placeholder="Например: Рогалик"
        onSubmit={createGenre}
      />

      <DirectoryModal
        open={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
        title="Добавить платформу"
        label="Название платформы"
        placeholder="Например: PlayStation 5"
        onSubmit={createPlatform}
      />
    </div>
  );
}
