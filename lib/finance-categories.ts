export const EXPENSE_CATEGORIES = [
  "Salary Payments",
  "Project Share",
  "Office Rent",
  "Electricity",
  "WiFi & Internet",
  "Domain & Hosting",
  "Tea & Snacks",
  "Marketing & Ads",
  "Miscellaneous",
  "Commision / Broker",
] as const;

export const PROJECT_EXPENSE_CATEGORIES = [
  "Domain & Hosting",
  "Marketing & Ads",
  "API / Tools",
  "Software / SaaS",
  "Miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const LEGACY_EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  Travel: "Miscellaneous",
  Meals: "Miscellaneous",
  Equipment: "Miscellaneous",
  Software: "Miscellaneous",
  Other: "Miscellaneous",
  Marketing: "Marketing & Ads",
  Salaries: "Salary Payments"
};

export function normalizeExpenseCategory(value: string | null | undefined): ExpenseCategory {
  const category = (value || "").trim();
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
    return category as ExpenseCategory;
  }

  return LEGACY_EXPENSE_CATEGORY_MAP[category] || "Miscellaneous";
}
