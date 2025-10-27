import React from "react";
import { Link } from "react-router-dom";
import { SearchX, RefreshCcw } from "lucide-react";
import { Glass } from "./Glass";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

export default function EmptyState({
  title = "Ничего не найдено",
  subtitle = "Попробуйте изменить фильтры",
  onReset,
}) {
  return (
    <div className="w-full flex items-center justify-center py-24">
      <motion.div
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl w-full px-4"
      >
        <Glass className="relative overflow-hidden text-center px-8 py-12">
          {/* декоративный блик */}
          <div
            className="pointer-events-none absolute -top-20 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, rgba(124,77,255,.35), rgba(54,225,182,.25), transparent)",
            }}
          />

          <div className="flex flex-col items-center gap-4 relative">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur">
              <SearchX className="w-12 h-12 opacity-90" />
            </div>

            <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
            <p className="text-sm opacity-75">{subtitle}</p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-4 py-2 rounded-xl transition
                             border border-white/15 bg-white/10 backdrop-blur
                             hover:bg-white/15 active:scale-[0.98]"
                  style={{
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Сбросить фильтры
                  </span>
                </button>
              )}

              <Link
                to="/"
                className="px-4 py-2 rounded-xl transition
                           border border-white/15 bg-white/10 backdrop-blur
                           hover:bg-white/15 active:scale-[0.98]"
                style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset" }}
              >
                На главную
              </Link>
            </div>
          </div>
        </Glass>
      </motion.div>
    </div>
  );
}