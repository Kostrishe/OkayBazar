import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export default function SelectGlass({
  value,
  onChange,
  options = [],
  className = "",
  ariaLabel = "Сортировка",
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [highlight, setHighlight] = useState(-1);

  // координаты портала (позиционируем относительно экрана)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const current = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  /**
   * Высчитать и сохранить позицию списка.
   */
  const computePosition = () => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8, // отступ вниз 8px
      left: rect.left,
      width: rect.width,
    });
  };

  // открытие / позиционирование
  useLayoutEffect(() => {
    if (open) {
      computePosition();
      // перепозиционирование при ресайзе/скролле
      const onResize = () => computePosition();
      const onScroll = () => computePosition();
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("scroll", onScroll, true);
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll, true);
      };
    }
    return undefined;
  }, [open]);

  // клик вне — закрыть
  useEffect(() => {
    function handleDocClick(e) {
      const btn = btnRef.current;
      if (btn && btn.contains(e.target)) return;
      setOpen(false);
      setHighlight(-1);
    }
    if (open) {
      document.addEventListener("mousedown", handleDocClick);
      return () => document.removeEventListener("mousedown", handleDocClick);
    }
    return undefined;
  }, [open]);

  /**
   * Обработка клавиатуры: стрелки, Enter, Escape.
   */
  function onKeyDown(e) {
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      setOpen(true);
      computePosition();
      const idx = Math.max(
        0,
        options.findIndex((o) => String(o.value) === String(value))
      );
      setHighlight(idx === -1 ? 0 : idx);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i < options.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i > 0 ? i - 1 : options.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) onChange?.(opt.value);
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Триггер (кнопка) */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={[
          "w-full min-w-[180px] rounded-xl px-3 pr-9 py-2 text-left",
          "text-white text-sm sm:text-base",
          "bg-[rgba(24,26,34,0.75)] backdrop-blur-2xl",
          "border border-white/12",
          "shadow-[inset_0_1px_10px_rgba(255,255,255,0.25),_0_0_25px_rgba(0,0,0,0.35)]",
          "hover:bg-[rgba(24,26,34,0.85)]",
          "focus:outline-none focus:ring-2 focus:ring-[rgba(124,77,255,0.35)]",
          "transition-all duration-300",
        ].join(" ")}
      >
        <span className="truncate">{current?.label ?? "—"}</span>
        <svg
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 opacity-85 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5 7l5 6 5-6"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-25" />
      </button>

      {/* Портал списка в body: поверх всего, без клиппинга родителями */}
      {open &&
        createPortal(
          <ul
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 999999,
            }}
            className={[
              "max-h-64 overflow-auto p-1 rounded-xl",
              "bg-[rgba(20,22,30,0.85)] backdrop-blur-2xl",
              "border border-white/15",
              "shadow-[inset_0_1px_10px_rgba(255,255,255,0.25),_0_18px_45px_rgba(0,0,0,0.55)]",
              "before:content-[''] before:absolute before:inset-0 before:rounded-xl before:pointer-events-none before:bg-gradient-to-br before:from-white/15 before:to-transparent",
              "animate-[fadeDown_140ms_ease-out]",
            ].join(" ")}
          >
            {options.map((opt, i) => {
              const selected = String(opt.value) === String(value);
              const active = i === highlight;
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange?.(opt.value);
                    setOpen(false);
                  }}
                  className={[
                    "relative rounded-lg px-4 py-2 cursor-pointer select-none text-white text-sm",
                    "transition-all duration-150",
                    active
                      ? "bg-[rgba(124,77,255,0.35)] border border-[rgba(124,77,255,0.4)]"
                      : selected
                      ? "bg-[rgba(255,255,255,0.14)] border border-white/20"
                      : "hover:bg-[rgba(255,255,255,0.08)] border border-transparent",
                  ].join(" ")}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>,
          document.body
        )}

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}