import React from "react";
import THEME from "../../styles/theme";

/**
 * Glass — базовая оболочка «стекла».
 * variant="default" — как было.
 * variant="liquid"  — плотное матовое стекло (без прозрачности), слои внутри.
 */
export const Glass = ({
  className = "",
  children,
  variant = "default",
  tone = "frost",
}) => {
  if (variant === "liquid") {
    const isFrost = tone === "frost";
    return (
      <div
        className={[
          "relative rounded-2xl overflow-hidden",
          isFrost
            ? "bg-[rgba(255,255,255,0.18)] border-white/30"
            : "bg-[rgba(13,17,23,0.92)] border-white/10",
          "backdrop-blur-[28px] backdrop-saturate-[180%] backdrop-contrast-125",
          "border shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
          className,
        ].join(" ")}
      >
        {/* мягкий внешний glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 -z-10 rounded-[26px] bg-white/10 blur-[22px] opacity-70"
        />

        {/* внутренняя градиентная кайма */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.25))",
            padding: "1px",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* спекуляры + шум */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute left-0 right-0 top-0 h-1/2 bg-gradient-to-b from-white/40 via-white/10 to-transparent" />
          <div className="absolute -top-10 -left-6 h-40 w-72 rotate-12 rounded-full bg-white/30 blur-[38px]" />
          <div className="absolute -bottom-16 right-10 h-28 w-40 -rotate-12 rounded-full bg-white/20 blur-[26px]" />
          <div
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)",
              filter: "blur(.25px)",
            }}
          />
        </div>

        {/* тонкая внутренняя линия сверху для объёма */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />

        <div className="relative">{children}</div>
      </div>
    );
  }

  // старый вариант
  return (
    <div
      className={`backdrop-blur-3xl bg-white/12 border border-white/20 rounded-2xl shadow-[0_16px_60px_rgba(124,77,255,0.10)] ${className}`}
      style={{
        background: "rgba(255,255,255,0.10)",
        borderColor: "rgba(255,255,255,0.22)",
        boxShadow: `0 16px 60px ${THEME.accent}, inset 0 1px 0 rgba(255,255,255,0.35)`,
      }}
    >
      {children}
    </div>
  );
};

export const GlassCard = ({ className = "", children }) => (
  <div className={`relative rounded-2xl overflow-hidden ${className}`}>
    <div className="absolute inset-0 backdrop-blur-3xl backdrop-saturate-150" />
    <div className="absolute inset-0 bg-gradient-to-b from-white/24 via-white/14 to-white/10" />
    <div
      className="absolute inset-0 rounded-2xl ring-1 ring-white/30"
      style={{ boxShadow: `0 20px 80px rgba(124,77,255,0.12)` }}
    />
    <div className="absolute inset-x-0 top-0 h-px bg-white/60" />
    <div className="relative">{children}</div>
  </div>
);

/** Оболочка секции с опциональной ссылкой "Смотреть всё" */
export const Section = ({
  title,
  children,
  className = "",
  showLink = true,
}) => {
  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white/90 flex items-center gap-2">
            <span
              className="inline-block w-1 h-5 rounded-full"
              style={{ background: THEME.accent }}
            />
            {title}
          </h2>
          {showLink && (
            <a
              href="/catalog"
              className="text-sm text-white/70 hover:text-white transition"
            >
              Смотреть всё
            </a>
          )}
        </div>
      )}
      {children}
    </section>
  );
};
