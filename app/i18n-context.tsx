// app/i18n-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "./i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; };
const LangCtx = createContext<Ctx>({ lang: "zh", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");

  // Optional: remember user selection
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("lang", lang);
    // Make <html lang> semantically correct
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh" : "en";
    }
  }, [lang]);

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() { return useContext(LangCtx); }
