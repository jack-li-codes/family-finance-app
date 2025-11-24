"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/app/i18n-context";
import { t } from "@/app/i18n";
import AuthGuard from "@/components/AuthGuard";

/** ========= 类型 ========= */
type TypeKeyCN = "收入" | "支出";

type Tx = {
  id: string;
  date: string;                 // YYYY-MM-DD
  type: "收入" | "支出" | "转账" | "income" | "expense" | "transfer";
  category: string;
  subcategory?: string;
  amount: number;
  currency: string;             // CAD / CNY / ...
  note?: string;
  account?: { name?: string } | null;
};

type Grouped = Record<
  string, // YYYY-MM
  Partial<
    Record<
      TypeKeyCN,
      {
        total: number;                  // Only count CAD and exclude "transfer" category
        categories: Record<string, Tx[]>;
      }
    >
  >
>;

/** ========= 小工具 ========= */
const fmt = (n: number) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** --- 兼容中英的类型与分类判断 --- */
const isIncome = (s: string) => s === "收入" || s.toLowerCase() === "income";
const isExpense = (s: string) => s === "支出" || s.toLowerCase() === "expense";
const isTransfer = (s: string) => s === "转账" || s.toLowerCase() === "transfer";
const isProjectCat = (s: string) =>
  s === "工程" || s.toLowerCase() === "project" || s === "Project";

/** 某些分类不参与占比与 total（工程、转账） */
const isExcludedForPercentOrTotal = (cat: string) =>
  isTransfer(cat) || isProjectCat(cat);

/** 通用折叠组件（按钮控制，移动端友好） */
function ToggleSection({
  title,
  right,
  defaultOpen = false,
  children,
  className = "",
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left select-none py-2"
      >
        <span className="flex items-center">
          <span
            className={`inline-block mr-2 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          {title}
        </span>
        {right ? <span className="text-sm text-gray-700">{right}</span> : null}
      </button>
      {open && <div className="pl-6 pb-2">{children}</div>}
    </div>
  );
}

/** ========= 页面 ========= */
export default function SummaryPage() {
  const { lang } = useLang();
  const [groupedData, setGroupedData] = useState<Grouped>({});

  useEffect(() => {
    (async () => {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        return;
      }

      // Fetch transactions filtered by user_id
      const { data, error } = await supabase
        .from("transactions")
        .select("*, account:account_id(name)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setGroupedData(groupByMonthAndCategory((data || []) as Tx[]));
    })();
  }, []);

  // Find the latest month to expand by default
  const latestMonth = useMemo(
    () => Object.keys(groupedData).sort().slice(-1)[0],
    [groupedData]
  );

  return (
    <AuthGuard>
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">
          {t("每月收支分类汇总（仅 CAD）", lang)}
        </h1>

        {Object.entries(groupedData).map(([month, data]) => (
          <ToggleSection
            key={month}
            title={<span className="text-lg font-semibold">{month}</span>}
            defaultOpen={month === latestMonth}
            className="border-b"
          >
            {(["收入", "支出"] as const).map((typeCN) => {
              const typeData = data[typeCN];
              if (!typeData) return null;

              const categoryData = typeData.categories;

              // For percentage calculation: only CAD and exclude "transfer/project"
              const percentBase = Object.entries(categoryData).reduce(
                (sum, [cat, list]) => {
                  if (isExcludedForPercentOrTotal(cat)) return sum;
                  const s = (list as Tx[])
                    .filter((t) => t.currency === "CAD")
                    .reduce((acc, t) => acc + Number(t.amount), 0);
                  return sum + s;
                },
                0
              );

              return (
                <ToggleSection
                  key={typeCN}
                  title={
                    <span className="text-md font-semibold">
                      {t(typeCN, lang)}：${fmt(typeData.total ?? 0)}
                    </span>
                  }
                  className="ml-2"
                  defaultOpen
                >
                  {Object.entries(categoryData).map(([cat, list]) => {
                    const arr = list as Tx[];
                    const filteredCAD = arr.filter((t) => t.currency === "CAD");
                    const catSum = filteredCAD.reduce(
                      (s, t) => s + Number(t.amount),
                      0
                    );
                    const showPercent = !isExcludedForPercentOrTotal(cat);
                    const percent =
                      showPercent && percentBase !== 0
                        ? ((catSum / percentBase) * 100).toFixed(2)
                        : null;

                    return (
                      <ToggleSection
                        key={cat}
                        title={
                          <span className="text-sm font-medium text-gray-800">
                            {t(cat, lang)}
                          </span>
                        }
                        right={
                          <>
                            ${fmt(catSum)}
                            {percent && (
                              <span className="text-xs text-gray-500 ml-2">
                                {t("（占 {n}%）", lang).replace("{n}", percent)}
                              </span>
                            )}
                          </>
                        }
                        className="ml-2"
                      >
                        <ul className="list-disc list-inside text-sm">
                          {arr.map((item) => (
                            <li key={item.id} className="py-0.5">
                              {item.date} —{" "}
                              {item.currency === "CAD"
                                ? `$${fmt(Number(item.amount))}`
                                : `￥${fmt(Number(item.amount))}`}{" "}
                              ({item.currency})
                              {item.note ? ` — ${item.note}` : ""}（
                              {t("账户", lang)}：
                              {item.account?.name || t("未知账户", lang)}）
                            </li>
                          ))}
                        </ul>
                      </ToggleSection>
                    );
                  })}
                </ToggleSection>
              );
            })}
          </ToggleSection>
        ))}
      </div>
    </AuthGuard>
  );
}

/** ✅ Only count currency === "CAD"; "transfer" not included in total (but still shown in category details) */
function groupByMonthAndCategory(transactions: Tx[]): Grouped {
  const result: Grouped = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    const ttype = (tx.type || "").toString();

    // Only categorize income/expense; "transfer" not included in statistics (but can be shown on other pages)
    if (!isIncome(ttype) && !isExpense(ttype)) continue;

    const typeCN: TypeKeyCN = isIncome(ttype) ? "收入" : "支出";
    const category = tx.category || "未分类";

    // —— Safely create hierarchy
    const monthObj = (result[month] ??= {});
    const typeObj = (monthObj[typeCN] ??= { total: 0, categories: {} });

    // —— Category list: show all currencies
    (typeObj.categories[category] ??= []).push(tx);

    // —— Count total: only CAD and skip "transfer/project"
    if (tx.currency !== "CAD" || isExcludedForPercentOrTotal(category)) continue;
    typeObj.total += Number(tx.amount);
  }

  return result;
}
