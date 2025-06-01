import AuthGuard from "@/components/AuthGuard";
import BalanceContent from "./BalanceContent";

export default function Page() {
  return (
    <AuthGuard>
      <BalanceContent />
    </AuthGuard>
  );
}
