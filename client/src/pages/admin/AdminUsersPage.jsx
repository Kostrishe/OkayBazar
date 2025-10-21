import React, { useEffect, useMemo, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import EmptyState from "../../components/ui/EmptyState";
import SelectGlass from "../../components/ui/SelectGlass";
import { Users as UsersIcon, Eye, Save, X } from "lucide-react";
import { fetchUsers, updateUserRole, fetchUser } from "../../services/users";

const ROLES = [
  { value: "customer", label: "customer" },
  { value: "admin", label: "admin" },
];

function fmt(dt) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ru-RU");
  } catch {
    return String(dt);
  }
}

function normalizeUser(u = {}) {
  const n = { ...u };
  if (n.updatedAt && !n.updated_at) n.updated_at = n.updatedAt;
  if (n.createdAt && !n.created_at) n.created_at = n.createdAt;
  return n;
}

export default function AdminUsersPage() {
  const [items, setItems] = useState(null); // null -> loading
  const [error, setError] = useState("");

  const [savingId, setSavingId] = useState(null); // индикатор сохранения роли
  const [draftRoles, setDraftRoles] = useState({}); // { [id]: "admin" | "customer" }

  // Модалка просмотра
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const hasData = useMemo(
    () => Array.isArray(items) && items.length > 0,
    [items]
  );

  function onChangeRole(id, next) {
    setDraftRoles((s) => ({ ...s, [id]: next }));
  }

  async function onSaveRole(id) {
    const role = draftRoles[id];
    if (!role) return;
    setSavingId(id);
    try {
      // отправляем ровно admin | customer
      await updateUserRole(id, role);

      // критично: после успешного сохранения перечитываем список из БД
      await reloadUsers();
    } catch (e) {
      console.error(e);
      // откатываем драфт к текущему значению из строки
      const current =
        (items || []).find((r) => r.id === id)?.role || "customer";
      setDraftRoles((s) => ({ ...s, [id]: current }));
      alert("Не удалось сохранить роль");
    } finally {
      setSavingId(null);
    }
  }

  // единая функция загрузки
  async function reloadUsers() {
    setError("");
    try {
      const list = await fetchUsers();
      const rows = Array.isArray(list) ? list.map(normalizeUser) : [];
      setItems(rows);

      // инициализируем драфты ролей строго из ответа БД
      const init = {};
      rows.forEach((u) => {
        if (u?.id != null) init[u.id] = u.role || "customer";
      });
      setDraftRoles(init);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить пользователей");
      setItems([]);
    }
  }

  // загрузка при монтировании
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reloadUsers();
      // если понадобится — можно добавить проверку cancelled
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openView(id) {
    setViewId(id);
    setViewLoading(true);
    setViewData(null);
    try {
      const data = await fetchUser(id);
      setViewData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setViewLoading(false);
    }
  }

  return (
    <div className="text-white">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon size={18} className="opacity-90" />
          <h2 className="text-lg font-semibold">Все пользователи</h2>
        </div>
      </div>

      <Glass className="p-0 overflow-visible">
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium w-[80px]">ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium w-[180px]">Роль</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Изменён</th>
                <th className="px-4 py-3 font-medium w-[160px]">Действия</th>
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
                      title={error ? "Ошибка" : "Нет пользователей"}
                      subtitle={
                        error ||
                        "Данные появятся после регистрации пользователей"
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((u) => {
                  const draft = draftRoles[u.id] ?? u.role ?? "customer";
                  const changed = draft !== (u.role ?? "customer");
                  const saving = savingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-white/10 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">{u.id}</td>
                      <td className="px-4 py-3">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        {u.full_name || u.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <SelectGlass
                          value={draft}
                          options={ROLES}
                          onChange={(val) => onChangeRole(u.id, val)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {fmt(u.created_at || u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {fmt(u.updated_at || u.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openView(u.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
                            title="Просмотр"
                          >
                            <Eye size={14} />
                            Просмотр
                          </button>

                          <button
                            type="button"
                            onClick={() => onSaveRole(u.id)}
                            disabled={!changed || saving}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-50 transition"
                            title="Сохранить роль"
                          >
                            <Save size={14} />
                            {saving ? "Сохранение…" : "Сохранить"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* Модалка просмотра пользователя */}
      {viewId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setViewId(null)}
          />
          <Glass className="relative p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Пользователь #{viewId}</h3>
              <button
                className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 flex items-center justify-center"
                onClick={() => setViewId(null)}
                title="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {viewLoading ? (
              <div className="h-24 rounded-xl bg-white/10 animate-pulse" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Field label="ID" value={String(viewData?.id ?? viewId)} />
                <Field label="Email" value={viewData?.email || "—"} />
                <Field
                  label="Имя"
                  value={viewData?.full_name || viewData?.name || "—"}
                />
                <Field label="Роль" value={viewData?.role || "—"} />
                <Field
                  label="Создан"
                  value={fmt(viewData?.created_at || viewData?.createdAt)}
                />
                <Field
                  label="Изменён"
                  value={fmt(viewData?.updated_at || viewData?.updatedAt)}
                />
              </div>
            )}

            <div className="mt-4 text-xs text-white/70">
              Редактирование доступно только для роли. Используйте селектор в
              таблице и кнопку «Сохранить».
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-white/70 text-xs mb-1">{label}</div>
      <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/20">
        {value}
      </div>
    </div>
  );
}
