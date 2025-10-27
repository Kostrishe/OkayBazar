import React, { useMemo } from "react";
import THEME from "../../styles/theme";

export default function Background() {
  const bg = useMemo(
    () => (
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${THEME.bg1}, ${THEME.bg2}, ${THEME.bg1})`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            opacity: 0.8,
          }}
        />
      </div>
    ),
    []
  );

  return bg;
}