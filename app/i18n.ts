// app/i18n.ts
export type Lang = 'zh' | 'en';

const base: Record<string, string> = {
   // ===== Top Navigation / General =====
   "账户管理": "Accounts",
   "收入/支出": "Transactions",
   "收入 / 支出": "Transactions",                // Compatible with spacing
   "收入 / 支出记录": "Transactions",            // Compatible with earlier title
   "收支汇总": "Summary",
   "账户总揽": "Account Overview",
   "账户总览": "Account Overview",               // Compatible with alternative spelling
   "工程记录": "Worklog",
   "工程时间记录": "Worklog",
   "已记录项目": "Recorded Work Items",
   "账户余额": "Balance",
   "账户余额快照": "Balance Snapshot",
   "项目管理": "Projects",
   "欢迎使用家庭财务App": "Welcome to the Family Finance App",
   "请通过上方导航栏访问各个功能模块：账户余额、收支记录、工程记录、收支汇总。":
     "Use the top navigation to access: Balance, Transactions, Worklog, and Summary.",
   "新增": "Add",
   "新增记录": "Add Record",
   "新建项目": "New Project",
   "添加账户": "Add Account",
   "添加记录": "Add Record",
   "编辑": "Edit",
   "删除": "Delete",
   "保存": "Save",
   "取消": "Cancel",
   "操作": "Actions",

   // Export
   "导出为Excel": "Export to Excel",
   "导出为 Excel": "Export to Excel",           // Compatible with spacing
   "导出 Excel": "Export to Excel",
   "导出中…": "Exporting…",

   // Loading/Empty states
   "加载中…": "Loading…",
   "加载失败：": "Load failed: ",
   "暂无数据。": "No data.",
   "暂无数据": "No data.",
   "暂无记录，请先新增": "No records yet. Please add one first.",

   // ===== Table Headers / Form Fields =====
   "账户名称": "Account Name",
   "日期": "Date",
   "类型": "Type",
   "分类": "Category",
   "二级分类": "Subcategory",
   "金额": "Amount",
   "账户": "Account",
   "币种": "Currency",
   "备注": "Note",
   "备注（施工内容）": "Note (Work Details)",
   "所有人": "Owner",
   "卡号": "Card Number",
   "初始余额": "Initial Balance",
   "当前余额": "Current Balance",
   "起始日期": "Start Date",
   "初始日期": "Initial Date",
   "名称": "Name",
   "地点": "Location",
   "出发时间": "Start Time",
   "回家时间": "End Time",
   "总工时": "Total Hours",
   "项目": "Project",
   "请选择项目": "Select Project",

   // Dropdown placeholders
   "选择分类": "Select Category",
   "选择二级分类": "Select Subcategory",
   "选择账户": "Select Account",

   // Default display values for missing data
   "无日期": "No Date",
   "无时间": "No Time",
   "无项目": "No Project",
   "无地点": "No Location",
   "无备注": "No Note",
   "未知账户": "Unknown Account",
   "未分类": "Uncategorized",

   // ===== Transaction Types =====
   "收入": "Income",
   "支出": "Expense",
   "转账": "Transfer",

   // ===== Account Overview Page Terminology =====
   "未分配账户": "Unassigned Account",
  // "账户": "Account",
   "上月余额": "Prev Balance",
   "下月余额": "Next Balance",
   "收入合计": "Total Income",
   "支出合计": "Total Expense",
   "净额": "Net",
   "净额（收+支）": "Net (Income + Expense)",
   "收入汇总（正）": "Income Total (Positive)",
   "支出汇总（负）": "Expense Total (Negative)",
   "收入汇总（为正）": "Income Total (Positive)",
   "支出汇总（为负）": "Expense Total (Negative)",
   "当月净额 = 收入 + 支出": "Monthly Net = Income + Expense",
   "下月余额 = 上月余额 + 净额": "Next Balance = Prev Balance + Net",
   "无收入明细": "No income items",
   "无支出明细": "No expense items",
   "转账（仅展示，不计入汇总）": "Transfers (shown only, not included in totals)",

   // ===== Page Messages / Dialogs =====
   "账户名称和所有人不能为空": "Account name and owner are required",
   "未登录用户，无法添加账户": "Not signed in; cannot add account",
   "确定要删除这个账户吗？": "Are you sure you want to delete this account?",
   "确定要删除这条记录吗？": "Are you sure you want to delete this record?",
   "确定要删除这个项目吗？": "Are you sure you want to delete this project?",
   "操作失败：": "Operation failed: ",
   "❌ 操作失败：": "Operation failed: ",       // Compatible with emoji version
   "删除失败：": "Delete failed: ",
   "❌ 删除失败：": "Delete failed: ",
   "保存失败：": "Save failed: ",
   "用户信息获取失败，请重新登录": "User info missing. Please sign in again.",

   // ===== Accounts Page: Summary Section (Positive/Negative Labels) =====
   "家庭账户管理": "Account Management",
   "家庭账户总余额": "Total Family Balance",
   "（正）": "(Positive)",
   "（负）": "(Negative)",

   // ===== Fixed Expenses Card (FixedExpenses Component) =====
   "当前月份固定花销": "Monthly Fixed Expenses",
   "当前月固定花销": "Monthly Fixed Expenses",
   "固定花销管理": "Fixed Expenses Management",
   "房贷": "Mortgage",
   "汽车保险": "Car Insurance",
   "房屋保险": "Home Insurance",
   "车 lease": "Car Lease",                    // Appeared in your code with this spelling
   "地税": "Property Tax",
   "水电": "Utilities",
   "燃气": "Gas",
   "煤气": "Gas",                              // Compatible with alternative spelling
   "宽带": "Internet",
   "电话费": "Phone Bill",

   // ===== Categories (Primary + Secondary) - Keep Chinese values, translate when displayed =====
   "食物": "Food",
   "买菜": "Groceries",
   "餐厅/外卖": "Restaurant/Takeout",
   "工作餐A": "Work Meal A",
   "工作餐B": "Work Meal B",
   "饮品/甜品": "Drinks/Dessert",
   "其他": "Other",
 
   "车辆": "Vehicle",
   "车1贷款": "Car 1 Loan",
   "车1加油": "Car 1 Fuel",
   "车2加油": "Car 2 Fuel",
   "车1修车保养": "Car 1 Service",
   "车2修车保养": "Car 2 Service",
 
   "工程": "Project",
   "自家工程": "Home Project",
   "客户工程": "Client Project",
 
   "房屋": "Housing",
   "网费": "Internet",
   "水费": "Water",
   "电费": "Electricity",
   "燃气费": "Gas",
   "手机费": "Mobile",
 
   "家用": "Household",
   "厨房用品": "Kitchen",
   "家居用品": "Home Goods",
   "卫浴用品": "Bath",
   "家居装饰": "Decor",
 
   "教育": "Education",
   "课外课程": "Extracurricular",
   "学校费用": "School Fees",
   "书籍/软件": "Books/Software",
   "考试费用": "Exam Fees",
   "学习用品": "Supplies",
   "运动/活动": "Sports/Activities",
   "爸妈教育": "Parents’ Education",
 
   "服饰": "Apparel",
   "鞋包/饰品": "Shoes/Bags/Accessories",
   "衣服": "Clothes",
   "美发美甲": "Hair/Nails",
   "护肤美容": "Skincare/Beauty",
 
   "休闲": "Leisure",
   "会员": "Membership",
   "门票/项目费用": "Tickets/Fees",
   "住宿": "Lodging",
   "交通": "Transport",
   "餐饮": "Dining",
 
   "医疗": "Medical",
   "牙医": "Dentist",
   "药物": "Medication",
   "门诊": "Clinic",
 
   "转账-": "Transfer",
   "还信用卡": "Credit Card Payment",
   "内部转账": "Internal Transfer",
 
   "补贴": "Adjustment",
   "平帐补贴": "Balance Adjustment",

    "预计开始": "Planned Start",
    "预计结束": "Planned End",
    "实际开始": "Actual Start",
    "实际结束": "Actual End",
   // "新建项目": "New Project",
    "所有项目": "All Projects",
    "固定花销-当前月": "Fixed Monthly Expenses",

    "活期账户": "Checking Account",
    "信用账户": "Credit Account",
    "现金账户": "Cash Account",
    "社保账户": "Social Account",


   // ===== Summary Page (SummaryPage) Terminology =====
   "每月收支分类汇总（仅 CAD）": "Monthly Category Summary (CAD only)",
   "（占 {n}%）": "(Share {n}%)"




  
};

export const dict = {
  zh: {} as Record<string, string>, // Chinese displays original text
  en: base,
};

export function t(key: string, lang: Lang) {
  if (lang === 'zh') return key;
  return dict.en[key] ?? key;
}
