import React, { useEffect, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import {
  Users as UsersIcon,
  Gamepad2,
  ShoppingBag,
  RefreshCcw,
  Server,
  Monitor,
  Database,
} from "lucide-react";
import {
  countUsers,
  countGames,
  countOrders,
  triggerSync,
  getAdminInfo,
  getDbTables,
} from "../../services/admin";

/* 
  Карточка статистики
 */
// eslint-disable-next-line no-unused-vars
function StatCard({ title, icon: IconComponent, value, loading, error }) {
  return (
    <Glass className="p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
          <IconComponent className="opacity-90" />
        </div>
        <div className="flex flex-col">
          <div className="text-sm text-white/80">{title}</div>
          {loading ? (
            <div className="h-7 w-16 bg-white/10 rounded-md animate-pulse mt-1" />
          ) : error ? (
            <div className="text-xs text-red-300 mt-1">Ошибка</div>
          ) : (
            <div className="text-3xl font-semibold mt-1">{value ?? "—"}</div>
          )}
        </div>
      </div>
    </Glass>
  );
}

/**
 * Плитка Launchpad
 */
// eslint-disable-next-line no-unused-vars
function Tile({ icon: IconComponent, title, subtitle, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group text-left rounded-2xl border border-white/20 bg-white/10 hover:bg-white/15 transition
                  shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] p-4 w-full ${
                    disabled ? "opacity-60 cursor-not-allowed" : ""
                  }`}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <IconComponent className="opacity-90" />
        </div>
        <div className="min-w-0">
          <div className="text-white font-medium truncate">{title}</div>
          {subtitle ? (
            <div className="text-white/75 text-sm truncate">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/**
 * Плитка-инфо
 */
// eslint-disable-next-line no-unused-vars
function InfoTile({ icon: IconComponent, title, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] p-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <IconComponent className="opacity-90" />
        </div>
        <div className="min-w-0">
          <div className="text-white font-medium">{title}</div>
          <div className="text-white/75 text-sm">{value ?? "—"}</div>
          {hint ? (
            <div className="text-white/60 text-xs mt-0.5">{hint}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * GET /api/admin/stats
 */
export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [errU, setErrU] = useState("");
  const [errG, setErrG] = useState("");
  const [errO, setErrO] = useState("");
  const [users, setUsers] = useState(null);
  const [games, setGames] = useState(null);
  const [orders, setOrders] = useState(null);

  const [syncing, setSyncing] = useState(false);
  const [info, setInfo] = useState({ backendPort: null, frontendPort: null });
  const [tables, setTables] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErrU("");
      setErrG("");
      setErrO("");
      try {
        // загружаем все метрики параллельно для скорости
        const [u, g, o, i, t] = await Promise.allSettled([
          countUsers(),
          countGames(),
          countOrders(),
          getAdminInfo(),
          getDbTables(),
        ]);

        if (cancelled) return;

        if (u.status === "fulfilled") setUsers(u.value);
        else setErrU(u.reason?.message || "users failed");
        if (g.status === "fulfilled") setGames(g.value);
        else setErrG(g.reason?.message || "games failed");
        if (o.status === "fulfilled") setOrders(o.value);
        else setErrO(o.reason?.message || "orders failed");

        if (i.status === "fulfilled" && i.value) setInfo(i.value);

        if (t.status === "fulfilled")
          setTables(Array.isArray(t.value) ? t.value : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSync() {
    setSyncing(true);
    try {
      await triggerSync();
      const [u, g, o] = await Promise.all([
        countUsers(),
        countGames(),
        countOrders(),
      ]);
      setUsers(u);
      setGames(g);
      setOrders(o);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  }

  const totalTables = Array.isArray(tables) ? tables.length : 0;

  return (
    <div className="grid gap-6 text-white">
      {/* Статистика */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title="Пользователи"
          icon={UsersIcon}
          value={users}
          loading={loading}
          error={!!errU}
        />
        <StatCard
          title="Игры"
          icon={Gamepad2}
          value={games}
          loading={loading}
          error={!!errG}
        />
        <StatCard
          title="Заказы"
          icon={ShoppingBag}
          value={orders}
          loading={loading}
          error={!!errO}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Glass className="p-5 lg:col-span-1">
          <div className="grid gap-3">
            <Tile
              icon={RefreshCcw}
              title={syncing ? "Синхронизация…" : "Обновить API данные"}
              subtitle="Перезапрос цен / синхронизация с внешним API"
              onClick={onSync}
              disabled={syncing}
            />
            <InfoTile
              icon={Server}
              title="Порт бэка"
              value={info.backendPort != null ? `:${info.backendPort}` : "—"}
            />
            <InfoTile
              icon={Monitor}
              title="Порт фронта"
              value={info.frontendPort != null ? `:${info.frontendPort}` : "—"}
            />
          </div>
        </Glass>

        {/* список таблиц */}
        <Glass className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-white/85 text-sm">База данных</div>
            <div className="text-white/70 text-sm">
              Всего таблиц: <span className="font-semibold">{totalTables}</span>
            </div>
          </div>

          {totalTables > 0 ? (
            <div className="flex flex-col gap-2">
              {tables.map((t, idx) => (
                <div
                  key={t}
                  className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-2
                   hover:bg-white/10 transition text-balance"
                  title={t}
                >
                  <span className="text-white/90">
                    {idx + 1}. {t}
                  </span>
                  <span className="text-white/50 text-xs uppercase tracking-wider">
                    TABLE
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/70 text-sm">Нет данных</div>
          )}
        </Glass>
      </div>
    </div>
  );
}