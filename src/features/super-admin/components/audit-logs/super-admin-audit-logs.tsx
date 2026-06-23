"use client";

import { useMemo, useState } from "react";
import {
  FiActivity,
  FiBox,
  FiCalendar,
  FiEye,
  FiFileText,
  FiLogIn,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CampusDataTable,
  CampusInput,
  campusToast,
} from "@/components/campushub";
import { Drawer } from "@/components/shared/drawer";
import { Empty } from "@/components/shared/empty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { DatePicker } from "@/components/ui/date-picker";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import type { SerializedSuperAdminAuditLog } from "@/features/super-admin/lib/super-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";

const allValue = "ALL";
const ranges = [
  "Last Hour",
  "Today",
  "Yesterday",
  "Last Week",
  "Last Month",
  "Last Year",
  "Custom Range",
];

type SuperAdminAuditLog = SerializedSuperAdminAuditLog;
type AuditRangeWindow = {
  start: Date;
  end: Date;
};

const distributionColors = [
  "var(--primary)",
  "#60DDA0",
  "#38BDF8",
  "#F59E0B",
  "#F472B6",
  "#A78BFA",
  "#F87171",
  "#34D399",
];

function uniqueLogOptions(logs: SuperAdminAuditLog[], key: keyof SuperAdminAuditLog) {
  return Array.from(new Set(logs.map((log) => String(log[key]))));
}

function startOfDay(date: Date) {
  const next = new Date(date);

  next.setHours(0, 0, 0, 0);

  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);

  next.setHours(23, 59, 59, 999);

  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);

  next.setDate(next.getDate() + days);

  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);

  next.setMonth(next.getMonth() + months);

  return next;
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);

  next.setHours(next.getHours() + hours);

  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLogDate(log: SuperAdminAuditLog) {
  if (!log.occurredAt) return null;

  const date = new Date(log.occurredAt);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCalendarDate(value: string, boundary: "start" | "end") {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return boundary === "start" ? startOfDay(date) : endOfDay(date);
}

function getCustomRangeWindow(startDate: string, endDate: string) {
  const start = parseCalendarDate(startDate, "start");
  const end = parseCalendarDate(endDate, "end");

  if (start && end) {
    return start <= end ? { start, end } : { start: end, end: endOfDay(start) };
  }

  if (start) {
    return { start, end: new Date() };
  }

  if (end) {
    return { start: new Date(0), end };
  }

  return null;
}

function getRangeWindow(range: string, customWindow?: AuditRangeWindow | null) {
  if (range === "Custom Range") return customWindow ?? null;

  const now = new Date();
  const today = startOfDay(now);

  if (range === "Last Hour") {
    return {
      start: new Date(now.getTime() - 60 * 60 * 1000),
      end: now,
    };
  }

  if (range === "Today") {
    return { start: today, end: now };
  }

  if (range === "Yesterday") {
    return { start: addDays(today, -1), end: today };
  }

  if (range === "Last Week") {
    return { start: addDays(today, -6), end: now };
  }

  if (range === "Last Month") {
    return { start: addDays(today, -29), end: now };
  }

  if (range === "Last Year") {
    return { start: addDays(today, -364), end: now };
  }

  return null;
}

function isInRange(
  log: SuperAdminAuditLog,
  range: string,
  customWindow?: AuditRangeWindow | null,
) {
  const window = getRangeWindow(range, customWindow);
  const date = getLogDate(log);

  if (!window || !date) return true;

  return date >= window.start && date <= window.end;
}

function getCustomTrendBuckets(customWindow: AuditRangeWindow) {
  const durationMs = customWindow.end.getTime() - customWindow.start.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (durationMs <= oneDayMs) {
    const bucketCount = 8;
    const bucketMs = Math.max(durationMs / bucketCount, 60 * 60 * 1000);

    return Array.from({ length: bucketCount }).map((_, index) => {
      const start = new Date(customWindow.start.getTime() + bucketMs * index);
      const end = new Date(start.getTime() + bucketMs);

      return {
        label: new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(start),
        start,
        end: end > customWindow.end ? customWindow.end : end,
      };
    });
  }

  const daySpan = Math.ceil(durationMs / oneDayMs);

  if (daySpan <= 62) {
    return Array.from({ length: daySpan + 1 }).map((_, index) => {
      const start = addDays(startOfDay(customWindow.start), index);

      return {
        label: new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
        }).format(start),
        start,
        end: addDays(start, 1),
      };
    });
  }

  const monthStart = new Date(
    customWindow.start.getFullYear(),
    customWindow.start.getMonth(),
    1,
  );
  const monthEnd = new Date(
    customWindow.end.getFullYear(),
    customWindow.end.getMonth(),
    1,
  );
  const monthSpan =
    (monthEnd.getFullYear() - monthStart.getFullYear()) * 12 +
    monthEnd.getMonth() -
    monthStart.getMonth() +
    1;

  return Array.from({ length: monthSpan }).map((_, index) => {
    const start = addMonths(monthStart, index);
    const end = addMonths(start, 1);

    return {
      label: new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: monthSpan > 12 ? "2-digit" : undefined,
      }).format(start),
      start,
      end,
    };
  });
}

function getTrendBuckets(range: string, customWindow?: AuditRangeWindow | null) {
  if (range === "Custom Range" && customWindow) {
    return getCustomTrendBuckets(customWindow);
  }

  const now = new Date();
  const today = startOfDay(now);

  if (range === "Last Hour") {
    return Array.from({ length: 7 }).map((_, index) => {
      const start = new Date(now.getTime() - (6 - index) * 10 * 60 * 1000);
      const end = new Date(start.getTime() + 10 * 60 * 1000);

      return {
        label: new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(start),
        start,
        end,
      };
    });
  }

  if (range === "Today" || range === "Yesterday") {
    const base = range === "Yesterday" ? addDays(today, -1) : today;

    return Array.from({ length: 8 }).map((_, index) => {
      const start = addHours(base, index * 3);

      return {
        label: new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
        }).format(start),
        start,
        end: addHours(start, 3),
      };
    });
  }

  const dayCount =
    range === "Last Month" ? 30 : range === "Last Year" ? 12 : 7;

  if (range === "Last Year") {
    return Array.from({ length: dayCount }).map((_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

      return {
        label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(start),
        start,
        end,
      };
    });
  }

  return Array.from({ length: dayCount }).map((_, index) => {
    const start = addDays(today, -(dayCount - 1 - index));

    return {
      label: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(start),
      start,
      end: addDays(start, 1),
    };
  });
}

function HeatmapCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "h-4 rounded-[3px] border border-border transition-transform hover:scale-125",
        value === 0 && "bg-surface-muted",
        value > 0 && value <= 2 && "bg-primary/20",
        value > 2 && value <= 4 && "bg-primary/40",
        value > 4 && value <= 6 && "bg-primary/70",
        value > 6 && "bg-primary",
      )}
      title={`${value} activities`}
    />
  );
}

function StatusBadge({ status }: { status: SuperAdminAuditLog["status"] }) {
  const classes = {
    Success: "border-success/30 bg-success/10 text-success",
    Warning: "border-warning/30 bg-warning/10 text-warning",
    Failed: "border-destructive/30 bg-destructive/10 text-destructive",
  }[status];

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function SuperAdminAuditLogs({
  initialLogs,
}: {
  initialLogs: SuperAdminAuditLog[];
}) {
  const [range, setRange] = useState("Last Week");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(allValue);
  const [university, setUniversity] = useState(allValue);
  const [category, setCategory] = useState(allValue);
  const [status, setStatus] = useState(allValue);
  const [viewing, setViewing] = useState<SuperAdminAuditLog | null>(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const customWindow = useMemo(
    () => getCustomRangeWindow(customStartDate, customEndDate),
    [customEndDate, customStartDate],
  );
  const rangeLogs = useMemo(
    () => initialLogs.filter((log) => isInRange(log, range, customWindow)),
    [customWindow, initialLogs, range],
  );
  const heatmap = useMemo(() => {
    const today = startOfDay(new Date());
    const counts = new Map<string, number>();

    rangeLogs.forEach((log) => {
      const date = getLogDate(log);

      if (!date) return;
      const key = dateKey(startOfDay(date));

      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from({ length: 49 }).map((_, index) => {
      const date = addDays(today, index - 48);

      return counts.get(dateKey(date)) ?? 0;
    });
  }, [rangeLogs]);
  const activityTrend = useMemo(() => {
    const buckets = getTrendBuckets(range, customWindow);

    return buckets.map((bucket) => {
      const logs = rangeLogs.filter((log) => {
        const date = getLogDate(log);

        return date ? date >= bucket.start && date < bucket.end : false;
      });

      return {
        label: bucket.label,
        actions: logs.length,
        logins: logs.filter((log) => log.action.includes("LOGIN")).length,
      };
    });
  }, [customWindow, range, rangeLogs]);
  const activityDistribution = useMemo(() => {
    const counts = rangeLogs.reduce((summary, log) => {
      summary.set(log.category, (summary.get(log.category) ?? 0) + 1);

      return summary;
    }, new Map<string, number>());

    return Array.from(counts.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 8)
      .map(([name, value], index) => ({
        name,
        value,
        color: distributionColors[index % distributionColors.length],
      }));
  }, [rangeLogs]);
  const overviewCards = [
    {
      label: "Total Actions",
      value: rangeLogs.length,
      icon: FiActivity,
      tone: "text-primary",
    },
    {
      label: "Total Logins",
      value: rangeLogs.filter((log) => log.action.includes("LOGIN")).length,
      icon: FiLogIn,
      tone: "text-info",
    },
    {
      label: "Projects Created",
      value: rangeLogs.filter((log) => log.action.includes("PROJECT")).length,
      icon: FiBox,
      tone: "text-success",
    },
    {
      label: "Products Created",
      value: rangeLogs.filter((log) => log.action.includes("PRODUCT")).length,
      icon: FiShoppingBag,
      tone: "text-warning",
    },
    {
      label: "Events Created",
      value: rangeLogs.filter((log) => log.action.includes("EVENT")).length,
      icon: FiCalendar,
      tone: "text-primary",
    },
    {
      label: "Announcements",
      value: rangeLogs.filter((log) => log.action.includes("ANNOUNCEMENT")).length,
      icon: FiFileText,
      tone: "text-destructive",
    },
  ];

  const filteredLogs = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return rangeLogs.filter((log) => {
      const matchesSearch =
        !normalized ||
        [
          log.user,
          log.role,
          log.university,
          log.action,
          log.category,
          log.entity,
          log.ipAddress,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return (
        matchesSearch &&
        (role === allValue || log.role === role) &&
        (university === allValue || log.university === university) &&
        (category === allValue || log.category === category) &&
        (status === allValue || log.status === status)
      );
    });
  }, [category, rangeLogs, role, search, status, university]);

  const columns: DataTableColumn<SuperAdminAuditLog>[] = [
    { key: "timestamp", header: "Timestamp" },
    { key: "user", header: "User" },
    { key: "role", header: "Role" },
    { key: "university", header: "University" },
    { key: "action", header: "Action" },
    { key: "category", header: "Category" },
    { key: "entity", header: "Entity" },
    { key: "ipAddress", header: "IP Address" },
    {
      key: "status",
      header: "Status",
      cell: (log) => <StatusBadge status={log.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (log) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(log),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2">
        {ranges.map((item) => (
          <Button
            key={item}
            type="button"
            variant={range === item ? "default" : "secondary"}
            onClick={() => {
              setRange(item);
              if (item === "Custom Range" && !customStartDate && !customEndDate) {
                const today = new Date();

                setCustomStartDate(dateKey(addDays(today, -6)));
                setCustomEndDate(dateKey(today));
              }
              campusToast.info({
                title: "Activity Range Updated",
                description: `Audit activity is now filtered by ${item.toLowerCase()}.`,
              });
            }}
          >
            {item}
          </Button>
        ))}
      </div>

      {range === "Custom Range" ? (
        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_auto] md:items-end">
          <label className="space-y-2">
            <span className="text-sm font-medium">Start date</span>
            <DatePicker
              value={customStartDate}
              placeholder="Select start date"
              fromYear={2020}
              toYear={new Date().getFullYear()}
              onChange={setCustomStartDate}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">End date</span>
            <DatePicker
              value={customEndDate}
              placeholder="Select end date"
              fromYear={2020}
              toYear={new Date().getFullYear()}
              onChange={setCustomEndDate}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCustomStartDate("");
              setCustomEndDate("");
            }}
          >
            Clear Dates
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="dashboard-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="dashboard-icon-tile flex h-9 w-9 items-center justify-center">
                    <Icon className={cn("h-4 w-4", card.tone)} aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                    live
                  </span>
                </div>
                <p className="mt-5 text-xl font-semibold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Activity Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-flow-col grid-rows-7 gap-1">
              {heatmap.map((value, index) => (
                <HeatmapCell key={`${range}-${index}`} value={value} />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Daily activity intensity for the selected range.
            </p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Activity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrend}>
                <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="actions"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="logins"
                  stroke="#60DDA0"
                  fill="#60DDA0"
                  fillOpacity={0.16}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {activityDistribution.length > 0 ? (
              <div className="grid h-full gap-3 md:grid-cols-[1fr_0.85fr] md:items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityDistribution}
                      dataKey="value"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {activityDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {activityDistribution.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                No distribution data for this range.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
        <div className="relative">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search audit logs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {[
          ["Role", role, setRole, uniqueLogOptions(initialLogs, "role")],
          ["University", university, setUniversity, uniqueLogOptions(initialLogs, "university")],
          ["Category", category, setCategory, uniqueLogOptions(initialLogs, "category")],
          ["Status", status, setStatus, uniqueLogOptions(initialLogs, "status")],
        ].map(([label, value, setter, options]) => (
          <Select
            key={label as string}
            value={value as string}
            onValueChange={setter as (value: string) => void}
          >
            <SelectTrigger>
              <SelectValue placeholder={label as string} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allValue}>All {label as string}</SelectItem>
              {(options as string[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <CampusDataTable
        columns={columns}
        data={filteredLogs}
        getRowId={(log) => log.id}
        empty={
          <Empty
            filterName={search || "selected filters"}
            title="No audit logs found"
            description="Adjust the filters to inspect more platform activity."
          />
        }
      />

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title="Log Details"
        description={viewing?.action}
      >
        {viewing ? (
          <div className="space-y-4">
            {[
              ["User", viewing.user],
              ["Role", viewing.role],
              ["University", viewing.university],
              ["Action", viewing.action],
              ["Timestamp", viewing.timestamp],
              ["Entity", viewing.entity],
              ["Category", viewing.category],
              ["IP Address", viewing.ipAddress],
              ["Status", viewing.status],
              ["Metadata", viewing.metadata],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-background p-4"
              >
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
