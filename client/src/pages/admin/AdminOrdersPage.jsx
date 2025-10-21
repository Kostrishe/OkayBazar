import React, { useMemo } from "react";
import { Glass } from "../../components/ui/Glass";
import SectionHeader from "./_parts/SectionHeader";
import NoData from "./_parts/NoData";

export default function AdminOrdersPage() {
  const items = useMemo(() => [], []);

  return (
    <div className="text-white">
      <SectionHeader title="Все заказы" />

      <Glass className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium">№ заказа</th>
                <th className="px-4 py-3 font-medium">Email покупателя</th>
                <th className="px-4 py-3 font-medium">Email доставки</th>
                <th className="px-4 py-3 font-medium">Статус заказа</th>
                <th className="px-4 py-3 font-medium">Статус оплаты</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Заметка</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Обновлён</th>
                <th className="px-4 py-3 font-medium">Выдан</th>
                <th className="px-4 py-3 font-medium w-[140px]">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6">
                    <NoData note="Позже подтянем из /api/orders" />
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
