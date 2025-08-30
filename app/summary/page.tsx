"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/** ========= 类型 ========= */
type TypeKey = "收入" | "支出";

type Tx = {
  id: string;
  date: string;                 // YYYY-MM-DD
  type: "收入" | "支出" | "转账";
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
      TypeKey,
      {
        total: number;                  // 仅统计 CAD 且排除“转账”分类
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
  const [groupedData, setGroupedData] = useState<Grouped>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, account:account_id(name)")
        .order("date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setGroupedData(groupByMonthAndCategory((data || []) as Tx[]));
    })();
  }, []);

  // 找出最新月份，用来默认展开
  const latestMonth = useMemo(
    () => Object.keys(groupedData).sort().slice(-1)[0],
    [groupedData]
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">每月收支分类汇总（仅 CAD）</h1>

      {Object.entries(groupedData).map(([month, data]) => (
        <ToggleSection
          key={month}
          title={<span className="text-lg font-semibold">{month}</span>}
          defaultOpen={month === latestMonth}
          className="border-b"
        >
          {(["收入", "支出"] as const).map((type) => {
            const typeData = data[type];
            if (!typeData) return null;

            const categoryData = typeData.categories;

            // 用于占比：仅 CAD，且排除 “转账/工程”
            const percentBase = Object.entries(categoryData).reduce(
              (sum, [cat, list]) => {
                if (["转账", "工程"].includes(cat)) return sum;
                const s = (list as Tx[])
                  .filter((t) => t.currency === "CAD")
                  .reduce((acc, t) => acc + Number(t.amount), 0);
                return sum + s;
              },
              0
            );

            return (
              <ToggleSection
                key={type}
                title={
                  <span className="text-md font-semibold">
                    {type}：${fmt(typeData.total ?? 0)}
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
                  const showPercent = !["转账", "工程"].includes(cat);
                  const percent =
                    showPercent && percentBase !== 0
                      ? ((catSum / percentBase) * 100).toFixed(2)
                      : null;

                  return (
                    <ToggleSection
                      key={cat}
                      title={
                        <span className="text-sm font-medium text-gray-800">
                          {cat}
                        </span>
                      }
                      right={
                        <>
                          ${fmt(catSum)}
                          {percent && (
                            <span className="text-xs text-gray-500 ml-2">
                              （占 {percent}%）
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
                            {item.note ? ` — ${item.note}` : ""}（账户：
                            {item.account?.name || "未知账户"}）
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
  );
}

/** ✅ 只统计 currency === "CAD"；“转账”不计入 total（但仍显示在分类明细中） */
function groupByMonthAndCategory(transactions: Tx[]): Grouped {
  const result: Grouped = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    const t = tx.type as string;

    // 仅对【收入/支出】做分类汇总；“转账”不进入统计（但可在其它页面展示）
    if (t !== "收入" && t !== "支出") continue;

    const type = t as TypeKey;
    const category = tx.category || "未分类";

    // —— 安全创建层级
    const monthObj = (result[month] ??= {});
    const typeObj = (monthObj[type] ??= { total: 0, categories: {} });

    // —— 分类列表：任何币种都显示
    (typeObj.categories[category] ??= []).push(tx);

    // —— 统计 total：仅 CAD 且跳过“转账”
    if (category === "转账" || tx.currency !== "CAD") continue;
    typeObj.total += Number(tx.amount);
  }

  return result;
}
