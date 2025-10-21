import React, { useMemo } from "react";
import { Glass } from "../../components/ui/Glass";
import SectionHeader from "./_parts/SectionHeader";
import NoData from "./_parts/NoData";
import { Plus } from "lucide-react";

export default function AdminGamesPage() {
  const items = useMemo(() => [], []);

  return (
    <div className="text-white">
      <SectionHeader title="Все игры">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 transition"
          onClick={() => undefined}
        >
          <Plus size={16} />
          Новая игра
        </button>
      </SectionHeader>

      <Glass className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium w-[90px]">ID</th>
                <th className="px-4 py-3 font-medium">Мини-обложка</th>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Разработчик</th>
                <th className="px-4 py-3 font-medium">Издатель</th>
                <th className="px-4 py-3 font-medium w-[160px]">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <NoData note="Позже загрузим из /api/games" />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Glass>
    </div>
  );
}
