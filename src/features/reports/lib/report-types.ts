export const reportDateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "last-90-days", label: "Last 90 Days" },
  { value: "last-year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
] as const;

export type ReportDateRangeKey =
  (typeof reportDateRangeOptions)[number]["value"];

export type ReportDateRange = {
  key: ReportDateRangeKey;
  label: string;
  from: string;
  to: string;
};

export type ReportMetric = {
  key: string;
  label: string;
  value: number;
  description: string;
};

export type ReportTrendPoint = {
  label: string;
  value: number;
};

export type ReportBreakdownPoint = {
  label: string;
  value: number;
};

export type ReportTableRow = {
  id: string;
  label: string;
  category: string;
  total: number;
  active: number;
  inactive: number;
  newInRange: number;
  related: number;
  metrics: Record<string, number | string>;
  trend: ReportTrendPoint[];
  relatedEntities: string[];
};

export type ReportSection = {
  key: string;
  title: string;
  description: string;
  metrics: ReportMetric[];
  trend: ReportTrendPoint[];
  breakdown: ReportBreakdownPoint[];
  rows: ReportTableRow[];
};

export type ReportsPayload = {
  scope: "platform" | "university";
  title: string;
  description: string;
  generatedAt: string;
  range: ReportDateRange;
  sections: ReportSection[];
};
