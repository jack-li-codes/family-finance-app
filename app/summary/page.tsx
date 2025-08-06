"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SummaryPage() {
  const [groupedData, setGroupedData] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, account:account_id(name)")
        .order("date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      const grouped = groupByMonthAndCategory(data);
      setGroupedData(grouped);
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">每月收支分类汇总（仅 CAD）</h1>
      {Object.entries(groupedData).map(([month, data]) => (
        <div key={month} className="mb-6 border-b pb-4">
          <h2 className="text-lg font-semibold">{month}</h2>
          {["收入", "支出"].map((type) => {
            const categoryData = data[type]?.categories ?? {};
            const percentBase = Object.entries(categoryData).reduce((sum, [cat, list]) => {
              if (["转账", "工程"].includes(cat)) return sum;
              return sum + (list as any[])
                .filter((item) => item.currency === "CAD")
                .reduce((s: number, item: any) => s + Number(item.amount), 0);
            }, 0);

            return (
              <div key={type} className="mt-2">
                <h3 className="text-md font-semibold">
                  {type}：${data[type]?.total?.toFixed(2) ?? 0}
                </h3>

                {Object.entries(categoryData).map(([cat, list]: [string, any]) => {
                  const filteredList = list.filter((item: any) => item.currency === "CAD");
                  const catSum = filteredList.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
                  const showPercent = !["转账", "工程"].includes(cat);
                  const percent = showPercent && percentBase !== 0
                    ? ((catSum / percentBase) * 100).toFixed(2)
                    : null;

                  return (
                    <div key={cat} className="ml-4 mb-2">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-800">{cat}</span>
                        <span className="text-gray-700">
                          ${catSum.toFixed(2)}
                          {percent && (
                            <span className="text-xs text-gray-500 ml-2">（占 {percent}%）</span>
                          )}
                        </span>
                      </div>

                      <ul className="list-disc list-inside text-sm mt-1">
                        {list.map((item: any) => (
                          <li key={item.id}>
                            {item.date} - 
                            {item.currency === "CAD" ? `$${item.amount}` : `￥${item.amount}`} 
                            ({item.currency}) - {item.note}（账户：{item.account?.name || "未知账户"}）
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ✅ 只统计 currency === "CAD" 的记录
function groupByMonthAndCategory(transactions: any[]) {
  const result: any = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    const type = tx.type;
    const category = tx.category;

    if (!result[month]) result[month] = {};
    if (!result[month][type]) result[month][type] = { total: 0, categories: {} };
    if (!result[month][type].categories[category]) {
      result[month][type].categories[category] = [];
    }

    result[month][type].categories[category].push(tx);

    if (category === "转账" || tx.currency !== "CAD") {
      continue;
    }

    result[month][type].total += Number(tx.amount);
  }

  return result;
}
