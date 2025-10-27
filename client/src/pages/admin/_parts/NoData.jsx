  import React from "react";
import EmptyState from "../../../components/ui/EmptyState";

/*
  Компонент-заглушка для отсутствующих данных
 */
export default function NoData({ title = "Нет данных", note = "Данные появятся после интеграции API" }) {
  return (
    <EmptyState
      title={title}
      description={note}
      className="py-10"
    />
  );
}