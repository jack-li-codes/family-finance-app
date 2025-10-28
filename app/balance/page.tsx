"use client";
import AuthGuard from "@/components/AuthGuard";
import BalanceContent from "./BalanceContent";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";


export default function Page() {
  const { lang } = useLang();
  return (
    <AuthGuard>
      <BalanceContent />
    </AuthGuard>
  );
}
