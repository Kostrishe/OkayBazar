// src/components/ui/CheckboxGlass.jsx
import React from "react";
import { Check } from "lucide-react";

export default function CheckboxGlass({ label, value, checked, onChange, className = "" }) {
  return (
    <label
      className={[
        "inline-flex items-center gap-2 select-none cursor-pointer",
        "text-white/90 text-sm",
        className,
      ].join(" ")}
    >
      {/* скрытый нативный input — для доступности */}
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.value, e.target.checked)}
        className="sr-only"
      />

      {/* стеклянный квадрат */}
      <span
        className={[
          "relative inline-flex h-5 w-5 items-center justify-center",
          "rounded-[6px]",
          "backdrop-blur-md bg-white/10 border border-white/20",
          "transition-all duration-200",
          checked ? "bg-[rgba(124,77,255,0.28)] border-[rgba(124,77,255,0.55)] ring-2 ring-[rgba(124,77,255,0.35)]"
                  : "hover:bg-white/14 hover:border-white/35",
          "shadow-[inset_0_1px_6px_rgba(255,255,255,0.18),_0_0_10px_rgba(255,255,255,0.06)]",
        ].join(" ")}
        aria-hidden="true"
      >
        {/* галочка */}
        <Check
          className={[
            "w-3.5 h-3.5 transition-opacity duration-150",
            checked ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </span>

      {/* подпись */}
      <span className="break-words leading-snug">{label}</span>
    </label>
  );
}