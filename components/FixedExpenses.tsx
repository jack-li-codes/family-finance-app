import React from "react";

export default function FixedExpenses() {
  return (
    <div style={{ backgroundColor: "#fffbe6", padding: "16px 24px", border: "1px solid #f0e6c8", borderRadius: 6, fontSize: "14px", flex: 1 }}>
      <strong style={{ display: "block", marginBottom: "8px" }}>📅 当前月份固定花销</strong>
      <div style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        rowGap: "6px",
        columnGap: "20px",
        whiteSpace: "nowrap"
      }}>
        <div>🏠 房贷:</div><div>4482.28（每月28号）</div>
        <div>🚗 汽车保险:</div><div>497.13（每月23号）</div>
        <div>🏡 房屋保险:</div><div>208.02（每月23号）</div>
        <div>🚘 车 lease:</div><div>817.22（每月10号）</div>
        <div>📅 地税:</div><div>1560（4月1次，6月25号）</div>
        <div>💡 水电:</div><div>约130（每月20号）</div>
        <div>🔥 煤气:</div><div>约130（每月20号）</div>
        <div>🌐 宽带:</div><div>74（每月5号，LJS信用卡）</div>
        <div>📱 电话费:</div><div>169.47（每月25号，JH信用卡）</div>
      </div>
    </div>
  );
}
