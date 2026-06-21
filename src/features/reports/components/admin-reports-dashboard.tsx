"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiChevronDown,
  FiDownload,
  FiEye,
  FiFileText,
  FiPieChart,
  FiTrendingUp,
} from "react-icons/fi";

import { CampusDataTable, Empty, campusToast } from "@/components/campushub";
import { Modal } from "@/components/shared/modal";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  reportDateRangeOptions,
  type ReportSection,
  type ReportTableRow,
  type ReportsPayload,
} from "../lib/report-types";

type AdminReportsDashboardProps = {
  data: ReportsPayload;
  basePath: string;
};

const numberFormatter = new Intl.NumberFormat("en");
const chartColors = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#0891b2"];

export function AdminReportsDashboard({
  data,
  basePath,
}: AdminReportsDashboardProps) {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<ReportSection>(
    data.sections[0],
  );
  const [selectedRow, setSelectedRow] = useState<ReportTableRow | null>(null);
  const [customFrom, setCustomFrom] = useState(data.range.from);
  const [customTo, setCustomTo] = useState(data.range.to);

  const columns = useMemo<DataTableColumn<ReportTableRow>[]>(
    () => [
      {
        key: "label",
        header: "Report Area",
        cell: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.category}</p>
          </div>
        ),
      },
      {
        key: "total",
        header: "Total",
        cell: (row) => formatNumber(row.total),
      },
      {
        key: "active",
        header: "Active",
        cell: (row) => formatNumber(row.active),
      },
      {
        key: "inactive",
        header: "Inactive",
        cell: (row) => formatNumber(row.inactive),
      },
      {
        key: "newInRange",
        header: "New",
        cell: (row) => formatNumber(row.newInRange),
      },
      {
        key: "related",
        header: "Related",
        cell: (row) => formatNumber(row.related),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setSelectedRow(row)}
            >
              <FiEye className="mr-2 h-4 w-4" aria-hidden="true" />
              View Details
            </Button>
            <ExportDropdown
              label="Export"
              title={row.label}
              rows={[row]}
              size="sm"
            />
          </div>
        ),
      },
    ],
    [selectedSection.title],
  );

  const applyRange = (range: string) => {
    const params = new URLSearchParams();
    params.set("range", range);

    if (range === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }

    router.replace(`${basePath}?${params.toString()}`);
  };

  const applyCustomRange = () => {
    const params = new URLSearchParams();
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.replace(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{data.title}</CardTitle>
            <CardDescription>{data.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:min-w-[560px]">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <Select value={data.range.key} onValueChange={applyRange}>
                <SelectTrigger aria-label="Date range">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {reportDateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedSection.key}
                onValueChange={(value) => {
                  const nextSection = data.sections.find(
                    (section) => section.key === value,
                  );

                  if (nextSection) {
                    setSelectedSection(nextSection);
                  }
                }}
              >
                <SelectTrigger aria-label="Report type">
                  <SelectValue placeholder="Report type" />
                </SelectTrigger>
                <SelectContent>
                  {data.sections.map((section) => (
                    <SelectItem key={section.key} value={section.key}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ExportDropdown
                label="Export"
                title={data.title}
                rows={data.sections.flatMap((section) =>
                  section.rows.map((row) => ({
                    ...row,
                    category: `${section.title} - ${row.category}`,
                  })),
                )}
              />
            </div>
            {data.range.key === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  type="date"
                  aria-label="Custom range start"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
                <Input
                  type="date"
                  aria-label="Custom range end"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
                <Button type="button" onClick={applyCustomRange}>
                  Apply
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground">
            {selectedSection.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedSection.description}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary Cards</CardTitle>
            <CardDescription>
              Key metrics for {selectedSection.title.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-4 md:grid-cols-2",
                selectedSection.metrics.length >= 5
                  ? "xl:grid-cols-5"
                  : selectedSection.metrics.length === 4
                    ? "xl:grid-cols-4"
                    : "xl:grid-cols-3",
              )}
            >
              {selectedSection.metrics.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-md border border-border bg-surface-muted p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-foreground">
                        {formatNumber(metric.value)}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FiTrendingUp className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-8 text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <ChartCard
            title="Historical Trends"
            description="Records created in the selected range."
          >
            {selectedSection.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={selectedSection.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty title="No trend data" description="No records exist for this date range." />
            )}
          </ChartCard>

          <ChartCard
            title="Status Breakdown"
            description="Distribution based on available backend statuses."
          >
            {selectedSection.breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={selectedSection.breakdown}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={54}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {selectedSection.breakdown.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty title="No breakdown data" description="No status distribution is available." />
            )}
          </ChartCard>

          <ChartCard title="Report Totals" description="Populated report rows.">
            {selectedSection.rows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={selectedSection.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty title="No table data" description="No records exist for this report section." />
            )}
          </ChartCard>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Detailed Table</CardTitle>
                <CardDescription>
                  Real backend metrics for {selectedSection.title.toLowerCase()}.
                </CardDescription>
              </div>
              <ExportDropdown
                label="Export Section"
                title={selectedSection.title}
                rows={selectedSection.rows}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CampusDataTable
              columns={columns}
              data={selectedSection.rows}
              getRowId={(row) => row.id}
              empty={
                <Empty
                  title="No report rows"
                  description="There are no backend records for this section yet."
                />
              }
            />
          </CardContent>
        </Card>
      </section>

      <Modal
        open={selectedRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRow(null);
          }
        }}
        title={selectedRow?.label ?? "Report details"}
        description="Full metrics, historical trends, and related entities."
        className="max-w-4xl"
      >
        {selectedRow ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(selectedRow.metrics).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border bg-surface-muted p-3"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {typeof value === "number" ? formatNumber(value) : value}
                  </p>
                </div>
              ))}
            </div>

            <ChartCard
              title="Historical Trends"
              description="Record creation trend for this metric."
              compact
            >
              {selectedRow.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={selectedRow.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty title="No trend data" description="No trend records exist for this row." />
              )}
            </ChartCard>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <FiPieChart className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="font-medium text-foreground">Related Entities</h3>
              </div>
              {selectedRow.relatedEntities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedRow.relatedEntities.map((entity) => (
                    <span
                      key={entity}
                      className="rounded-md border border-border bg-surface-muted px-3 py-1 text-sm text-muted-foreground"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No related entities"
                  description="No related entities were returned from the backend for this row."
                />
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  compact,
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={compact ? "h-64" : "h-80"}>{children}</div>
      </CardContent>
    </Card>
  );
}

function ExportDropdown({
  label,
  title,
  rows,
  size,
}: {
  label: string;
  title: string;
  rows: ReportTableRow[];
  size?: "default" | "sm";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size={size} variant="secondary">
          <FiDownload className="mr-2 h-4 w-4" aria-hidden="true" />
          {label}
          <FiChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => exportRows("pdf", title, rows)}>
          <FiFileText className="h-4 w-4" aria-hidden="true" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportRows("csv", title, rows)}>
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function exportRows(
  format: "pdf" | "csv",
  title: string,
  rows: ReportTableRow[],
) {
  if (rows.length === 0) {
    campusToast.info({
      title: "No data to export",
      description: "This report section does not have backend records yet.",
    });
    return;
  }

  if (format === "pdf") {
    openPrintableReport(title, rows);
    campusToast.success({
      title: "PDF export opened",
      description: "Use the print dialog to save the report as PDF.",
    });
    return;
  }

  downloadFile(`${slugify(title)}.csv`, toCsv(rows), "text/csv;charset=utf-8");

  campusToast.success({
    title: "Export complete",
    description: `${title} exported as CSV.`,
  });
}

function toCsv(rows: ReportTableRow[]) {
  const headers = ["Report Area", "Category", "Total", "Active", "Inactive", "New", "Related"];
  const body = rows.map((row) =>
    [row.label, row.category, row.total, row.active, row.inactive, row.newInRange, row.related]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...body].join("\n");
}

function toHtmlTable(title: string, rows: ReportTableRow[]) {
  const tableRows = rows
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.category)}</td><td>${row.total}</td><td>${row.active}</td><td>${row.inactive}</td><td>${row.newInRange}</td><td>${row.related}</td></tr>`,
    )
    .join("");

  return `<html><body><table><caption>${escapeHtml(title)}</caption><thead><tr><th>Report Area</th><th>Category</th><th>Total</th><th>Active</th><th>Inactive</th><th>New</th><th>Related</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
}

function openPrintableReport(title: string, rows: ReportTableRow[]) {
  const win = window.open("", "_blank", "width=960,height=720");

  if (!win) {
    campusToast.error({
      title: "Export blocked",
      description: "Allow pop-ups to open the printable PDF export.",
    });
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 24px; margin-bottom: 16px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${toHtmlTable(title, rows)}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    win.print();
  }, 250);
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}
