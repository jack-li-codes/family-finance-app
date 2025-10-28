// app/i18n-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "./i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; };
const LangCtx = createContext<Ctx>({ lang: "zh", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  // 可选：记住用户选择
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("lang", lang);
    // 让 <html lang> 语义正确
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh" : "en";
    }
  }, [lang]);

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() { return useContext(LangCtx); }
