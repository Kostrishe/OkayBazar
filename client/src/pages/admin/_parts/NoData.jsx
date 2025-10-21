import React from "react";
import EmptyState from "../../../components/ui/EmptyState";

export default function NoData({ title = "Нет данных", note = "Данные появятся после интеграции API" }) {
  return (
    <EmptyState
      title={title}
      description={note}
      className="py-10"
    />
  );
}
