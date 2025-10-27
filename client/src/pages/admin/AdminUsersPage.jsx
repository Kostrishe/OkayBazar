import React, { useEffect, useMemo, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import EmptyState from "../../components/ui/EmptyState";
import SelectGlass from "../../components/ui/SelectGlass";
import { Users as UsersIcon, Eye, Save, X, Plus, Trash2 } from "lucide-react";
import { fetchUsers, updateUserRole, fetchUser, createUser, deleteUser } from "../../services/users";

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

// нормализация пользователя (на случай разных форматов полей)
function normalizeUser(u = {}) {
  const n = { ...u };
  if (n.updatedAt && !n.updated_at) n.updated_at = n.updatedAt;
  if (n.createdAt && !n.created_at) n.created_at = n.createdAt;
  return n;
}

/**
 * GET /api/users
 * Админская страница управления пользователями.
 * Я сделала возможность просмотра, изменения роли, добавления и удаления пользователей.
 */
export default function AdminUsersPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const [savingId, setSavingId] = useState(null);
  const [draftRoles, setDraftRoles] = useState({});

  // модалка просмотра
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // модалка добавления
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", full_name: "", password: "", role: "customer" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // подтверждение удаления
  const [delId, setDelId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const hasData = useMemo(() => Array.isArray(items) && items.length > 0, [items]);

  // единая загрузка
  async function reloadUsers() {
    setError("");
    try {
      const list = await fetchUsers();
      const rows = Array.isArray(list) ? list.map(normalizeUser) : [];
      setItems(rows);

      // инициализируем черновики ролей
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

  useEffect(() => {
    reloadUsers();
  }, []);

  function onChangeRole(id, next) {
    setDraftRoles((s) => ({ ...s, [id]: next }));
  }

  async function onSaveRole(id) {
    const role = draftRoles[id];
    if (!role) return;
    setSavingId(id);
    try {
      await updateUserRole(id, role);
      await reloadUsers(); // перезагружаем, чтобы взять updated_at из БД
    } catch (e) {
      console.error(e);
      const current = (items || []).find((r) => r.id === id)?.role || "customer";
      setDraftRoles((s) => ({ ...s, [id]: current }));
      alert("Не удалось сохранить роль");
    } finally {
      setSavingId(null);
    }
  }

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

  function validateAddForm(f) {
    if (!f.email || !/\S+@\S+\.\S+/.test(f.email)) return "Укажите корректный email";
    if (!f.password || f.password.length < 6) return "Пароль должен быть не менее 6 символов";
    if (!f.role || !["admin", "customer"].includes(f.role)) return "Выберите роль";
    return "";
  }

  async function onCreateUser() {
    const err = validateAddForm(addForm);
    if (err) {
      setAddError(err);
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      await createUser({
        email: addForm.email.trim(),
        full_name: addForm.full_name.trim() || null,
        password: addForm.password,
        role: addForm.role,
      });
      setAddOpen(false);
      setAddForm({ email: "", full_name: "", password: "", role: "customer" });
      await reloadUsers();
    } catch (e) {
      console.error(e);
      setAddError("Не удалось создать пользователя");
    } finally {
      setAdding(false);
    }
  }

  async function onConfirmDelete() {
    if (!delId) return;
    setDeleting(true);
    try {
      await deleteUser(delId);
      setDelId(null);
      await reloadUsers();
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить пользователя");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="text-white">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon size={18} className="opacity-90" />
          <h2 className="text-lg font-semibold">Все пользователи</h2>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
          title="Добавить пользователя"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <Glass className="p-0 overflow-visible">
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium w-[80px]">ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium w-[180px]">Роль</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Изменён</th>
                <th className="px-4 py-3 font-medium w-[220px]">Действия</th>
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
                      subtitle={error || "Данные появятся после регистрации пользователей"}
                    />
                  </td>
                </tr>
              ) : (
                items.map((u) => {
                  const draft = draftRoles[u.id] ?? u.role ?? "customer";
                  const changed = draft !== (u.role ?? "customer");
                  const saving = savingId === u.id;

                  return (
                    <tr key={u.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3">{u.id}</td>
                      <td className="px-4 py-3">{u.email || "—"}</td>
                      <td className="px-4 py-3">{u.full_name || u.name || "—"}</td>
                      <td className="px-4 py-3">
                        <SelectGlass
                          value={draft}
                          options={ROLES}
                          onChange={(val) => onChangeRole(u.id, val)}
                        />
                      </td>
                      <td className="px-4 py-3">{fmt(u.created_at || u.createdAt)}</td>
                      <td className="px-4 py-3">{fmt(u.updated_at || u.updatedAt)}</td>
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

                          <button
                            type="button"
                            onClick={() => setDelId(u.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-400/30 bg-red-500/10 hover:bg-red-500/15 text-red-200 transition"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                            Удалить
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

      {/* Модалка добавления */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <Glass className="relative p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Новый пользователь</h3>
              <button
                className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 flex items-center justify-center"
                onClick={() => setAddOpen(false)}
                title="Закрыть"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-white/70 text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((s) => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 bg-white/10 border border-white/25"
                  placeholder="user@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-white/70 text-xs mb-1 block">Имя</label>
                <input
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((s) => ({ ...s, full_name: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 bg-white/10 border border-white/25"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="text-white/70 text-xs mb-1 block">Пароль</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((s) => ({ ...s, password: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 bg-white/10 border border-white/25"
                  placeholder="минимум 6 символов"
                />
              </div>

              <div>
                <label className="text-white/70 text-xs mb-1 block">Роль</label>
                <SelectGlass
                  value={addForm.role}
                  options={ROLES}
                  onChange={(val) => setAddForm((s) => ({ ...s, role: val }))}
                />
              </div>
            </div>

            {addError ? <div className="mt-3 text-sm text-red-300">{addError}</div> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl px-4 py-2 border border-white/25 bg-white/10 hover:bg-white/15"
                onClick={() => setAddOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-xl px-4 py-2 border text-white disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #7C4DFF, #36E1B6)", borderColor: "transparent" }}
                onClick={onCreateUser}
                disabled={adding}
                type="button"
              >
                {adding ? "Создание…" : "Создать"}
              </button>
            </div>
          </Glass>
        </div>
      )}

      {/* Подтверждение удаления */}
      {delId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDelId(null)} />
          <Glass className="relative p-5 w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Удалить пользователя</h3>
              <button
                className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 flex items-center justify-center"
                onClick={() => setDelId(null)}
                title="Закрыть"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-white/80 text-sm">
              Вы уверены, что хотите удалить пользователя #{delId}? Это действие необратимо.
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl px-4 py-2 border border-white/25 bg-white/10 hover:bg-white/15"
                onClick={() => setDelId(null)}
                type="button"
              >
                Отмена
              </button>
              <button
                className="rounded-xl px-4 py-2 border border-red-400/30 bg-red-500/15 text-red-100 disabled:opacity-60"
                onClick={onConfirmDelete}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </Glass>
        </div>
      )}

      {/* Модалка просмотра пользователя */}
      {viewId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewId(null)} />
          <Glass className="relative p-5 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Пользователь #{viewId}</h3>
              <button
                className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 flex items-center justify-center"
                onClick={() => setViewId(null)}
                title="Закрыть"
                type="button"
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
                <Field label="Имя" value={viewData?.full_name || viewData?.name || "—"} />
                <Field label="Роль" value={viewData?.role || "—"} />
                <Field label="Создан" value={fmt(viewData?.created_at || viewData?.createdAt)} />
                <Field label="Изменён" value={fmt(viewData?.updated_at || viewData?.updatedAt)} />
              </div>
            )}

            <div className="mt-4 text-xs text-white/70">
              Редактирование доступно только для роли. Используйте селектор в таблице и кнопку «Сохранить».
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
      <div className="px-3 py-2 rounded-lg bg-white/10 border border-white/20">{value}</div>
    </div>
  );
}