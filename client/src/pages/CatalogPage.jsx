// src/pages/CatalogPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { fetchGames, fetchGenres, fetchPlatforms } from "../services/games";

import CheckboxGlass from "../components/ui/CheckboxGlass";
import SelectGlass from "../components/ui/SelectGlass";
import { Glass, Section } from "../components/ui/Glass";
import ProductCard from "../components/ProductCard";
import Background from "../components/ui/Background";
import EmptyState from "../components/ui/EmptyState";
import { SearchX } from "lucide-react";
import GameModal from "../components/GameModal"; // ← добавлено

const LIMIT = 25;

export default function CatalogPage() {
  // справочники из БД
  const [genresList, setGenresList] = useState([]); // [{id, name}]
  const [platformsList, setPlatformsList] = useState([]); // [{id, name}]

  // выбранные значения (как ID)
  const [selectedGenreIds, setSelectedGenreIds] = useState(new Set());
  const [selectedPlatformIds, setSelectedPlatformIds] = useState(new Set());
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // сортировка и данные
  const [sort, setSort] = useState("name"); // name | price_asc | price_desc
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // состояние модалки игры
  const [openedGame, setOpenedGame] = useState(null); // id или slug

  // загрузка справочников
  useEffect(() => {
    let alive = true;
    (async () => {
      const [g, p] = await Promise.all([fetchGenres(), fetchPlatforms()]);
      if (!alive) return;
      setGenresList(g || []);
      setPlatformsList(p || []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // загрузка списка игр
  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const nextPage = reset ? 1 : page;
        const items = await fetchGames({
          sort,
          genreIds: [...selectedGenreIds],
          platformIds: [...selectedPlatformIds],
          priceMin,
          priceMax,
          page: nextPage,
          limit: LIMIT,
        });

        if (reset) setGames(items);
        else setGames((prev) => [...prev, ...items]);

        setHasMore(items.length === LIMIT);
        setPage(nextPage + 1);
      } catch (e) {
        console.error(e);
        if (reset) setGames([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [sort, selectedGenreIds, selectedPlatformIds, priceMin, priceMax, page]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // переключатели через value из input (исключаем undefined)
  const renderGenres = () => (
    <div className="mb-4">
      <div className="text-white/75 text-sm mb-2">Жанры</div>
      <div className="flex flex-col gap-2">
        {genresList.length === 0 ? (
          <div className="text-white/50 text-sm">Нет данных</div>
        ) : (
          genresList.map((g) => (
            <CheckboxGlass
              key={String(g.id)}
              value={String(g.id)}
              label={g.name}
              checked={selectedGenreIds.has(String(g.id))}
              onChange={(val, next) => {
                setSelectedGenreIds((prev) => {
                  const nextSet = new Set(prev);
                  next ? nextSet.add(val) : nextSet.delete(val);
                  return nextSet;
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderPlatforms = () => (
    <div className="mb-4">
      <div className="text-white/75 text-sm mb-2">Платформы</div>
      <div className="flex flex-col gap-2">
        {platformsList.length === 0 ? (
          <div className="text-white/50 text-sm">Нет данных</div>
        ) : (
          platformsList.map((p) => (
            <CheckboxGlass
              key={String(p.id)}
              value={String(p.id)}
              label={p.name}
              checked={selectedPlatformIds.has(String(p.id))}
              onChange={(val, next) => {
                setSelectedPlatformIds((prev) => {
                  const nextSet = new Set(prev);
                  next ? nextSet.add(val) : nextSet.delete(val);
                  return nextSet;
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );

  const resetFilters = () => {
    setSelectedGenreIds(new Set());
    setSelectedPlatformIds(new Set());
    setPriceMin("");
    setPriceMax("");
  };

  return (
    <div className="min-h-screen font-sans text-white relative">
      <Background />

      {/* модалка игры */}
      <GameModal
        gameIdOrSlug={openedGame}
        open={!!openedGame}
        onClose={() => setOpenedGame(null)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-10">
        <Section title="Каталог игр" showLink={false} className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Левая колонка фильтров */}
            <aside className="lg:col-span-3 space-y-4">
              <Glass className="p-4">
                <div className="text-white/85 font-medium mb-3">Фильтры</div>

                {renderGenres()}
                {renderPlatforms()}

                {/* Цена */}
                <div className="mb-2">
                  <div className="text-white/75 text-sm mb-2">Цена, ₽</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="от"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-1/2 rounded-lg bg-white/15 text-white border border-white/30 px-3 py-2 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="до"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-1/2 rounded-lg bg-white/15 text-white border border-white/30 px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      await load(true);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white border border-white/30 bg-white/15 hover:bg-white/25 transition disabled:opacity-60"
                  >
                    {loading ? "Загрузка…" : "Применить"}
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-lg text-sm text-white/80 border border-white/20 hover:bg-white/10 transition"
                  >
                    Сбросить
                  </button>
                </div>
              </Glass>
            </aside>

            {/* Правая часть: сортировка + карточки */}
            <section className="lg:col-span-9">
              {/* сортировка слева над сеткой */}
              <div className="mb-4">
                <Glass className="p-3 overflow-visible relative z-40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white/80 text-sm">
                        Сортировать по:
                      </span>

                      <SelectGlass
                        value={sort}
                        onChange={(v) => setSort(v)}
                        options={[
                          { value: "name", label: "Названию" },
                          { value: "price_asc", label: "Цене ↑" },
                          { value: "price_desc", label: "Цене ↓" },
                        ]}
                        className="min-w-[180px]"
                      />
                    </div>
                    <div className="text-white/60 text-sm hidden sm:block">
                      Показано: {games.length}
                      {loading ? "…" : ""}
                    </div>
                  </div>
                </Glass>
              </div>

              {/* сетка карточек */}
              <div
                className="grid gap-5
             [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]    /* ≥ lg */
             sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))] /* ≥ sm */
             xl:[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] /* ≥ xl */"
              >
                {games.length === 0 && !loading && (
                  <div className="col-span-full">
                    <Glass className="relative overflow-hidden text-center px-8 py-12">
                      {/* лёгкий «блик» */}
                      <div
                        className="pointer-events-none absolute -top-24 -right-28 h-72 w-72 rounded-full opacity-25 blur-3xl"
                        style={{
                          background:
                            "radial-gradient(60% 60% at 50% 50%, rgba(124,77,255,.35), rgba(54,225,182,.25), transparent)",
                        }}
                      />
                      <div className="relative flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur">
                          <SearchX className="w-12 h-12 opacity-90" />
                        </div>

                        <h3 className="text-2xl font-semibold tracking-tight">
                          Ничего не найдено
                        </h3>
                        <p className="text-sm text-white/70">
                          Попробуйте изменить фильтры или диапазон цены
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={resetFilters}
                            className="btn-glass px-4 py-2 rounded-xl active:scale-[0.98] transition"
                          >
                            Сбросить фильтры
                          </button>
                        </div>
                      </div>
                    </Glass>
                  </div>
                )}

                {games.map((g) => (
                  <ProductCard
                    key={g.id || g.slug || g.name}
                    {...g}
                    onOpen={
                      () => setOpenedGame(g.id ?? g.slug ?? g.name) // ← пробрасываем открытие модалки
                    }
                  />
                ))}
              </div>

              {/* Загрузить ещё */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => load(false)}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-white border border-white/30 bg-white/15 hover:bg-white/25 transition disabled:opacity-60"
                  >
                    {loading ? "Загрузка…" : "Загрузить ещё"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </Section>
      </main>
    </div>
  );
}
