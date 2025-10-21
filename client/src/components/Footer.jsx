import React from "react";
import { Glass, Section } from "./ui/Glass";
import logo from "../assets/OkayBazar.png";

export default function Footer() {
  return (
    <footer className="mt-12">
      <Section>
        <Glass className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <a href="/" className="flex items-center gap-3 text-white/85">
              <img
                src={logo}
                alt="OkayBazar"
                className="w-20 h-20 rounded-xl"
                style={{ filter: "drop-shadow(0 0 15px rgba(255,255,255,0.4))", transform: "translateY(2px)" }}
              />
            </a>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm text-white/70">
              <div>
                <div className="text-white/85 font-medium mb-2">Навигация</div>
                <ul className="space-y-1">
                  <li><a href="#" className="hover:text-white">Главная</a></li>
                  <li><a href="#catalog" className="hover:text-white">Каталог</a></li>
                </ul>
              </div>
              <div>
                <div className="text-white/85 font-medium mb-2">Помощь</div>
                <ul className="space-y-1">
                  <li><a href="#" className="hover:text-white">Поддержка</a></li>
                  <li><a href="#" className="hover:text-white">Возвраты</a></li>
                </ul>
              </div>
              <div>
                <div className="text-white/85 font-medium mb-2">Правовое</div>
                <ul className="space-y-1">
                  <li><a href="#" className="hover:text-white">Пользовательское соглашение</a></li>
                  <li><a href="#" className="hover:text-white">Политика конфиденциальности</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 text-white/60 text-xs flex items-center justify-between">
            <span>© {new Date().getFullYear()} OkayBazar</span>
          </div>
        </Glass>
      </Section>
    </footer>
  );
}
