import React, { useMemo } from "react";
import { Glass } from "../../components/ui/Glass";
import SectionHeader from "./_parts/SectionHeader";
import NoData from "./_parts/NoData";
import { Plus, Shapes } from "lucide-react";

export default function AdminTaxonomiesPage() {
  const genres = useMemo(() => [], []);
  const platforms = useMemo(() => [], []);

  return (
    <div className="grid gap-6">
      <div>
        <SectionHeader title="Жанры">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
            onClick={() => undefined}
          >
            <Plus size={16} />
            Добавить жанр
          </button>
        </SectionHeader>

        <Glass className="p-0">
          {genres.length === 0 ? (
            <div className="p-6">
              <NoData note="Подтянем из /api/genres" />
            </div>
          ) : (
            <div className="p-4">Тут будет список жанров</div>
          )}
        </Glass>
      </div>

      <div>
        <SectionHeader title="Платформы">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
            onClick={() => undefined}
          >
            <Plus size={16} />
            Добавить платформу
          </button>
        </SectionHeader>

        <Glass className="p-0">
          {platforms.length === 0 ? (
            <div className="p-6">
              <NoData note="Подтянем из /api/platforms" />
            </div>
          ) : (
            <div className="p-4">Тут будет список платформ</div>
          )}
        </Glass>
      </div>
    </div>
  );
}
