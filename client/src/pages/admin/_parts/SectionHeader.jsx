import React from "react";

export default function SectionHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}