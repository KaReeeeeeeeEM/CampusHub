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

function uniqueLogOptions(logs: SuperAdminAuditLog[], key: keyof SuperAdminAuditLog) {
  return Array.from(new Set(logs.map((log) => String(log[key]))));
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
  const heatmap = useMemo<number[]>(() => [], []);
  const activityTrend: Array<{ label: string; actions: number; logins: number }> = [];
  const activityDistribution: Array<{ name: string; value: number; color: string }> = [];
  const overviewCards = [
    {
      label: "Total Actions",
      value: initialLogs.length,
      icon: FiActivity,
      tone: "text-primary",
    },
    {
      label: "Total Logins",
      value: initialLogs.filter((log) => log.action.includes("LOGIN")).length,
      icon: FiLogIn,
      tone: "text-info",
    },
    {
      label: "Projects Created",
      value: initialLogs.filter((log) => log.action.includes("PROJECT")).length,
      icon: FiBox,
      tone: "text-success",
    },
    {
      label: "Products Created",
      value: initialLogs.filter((log) => log.action.includes("PRODUCT")).length,
      icon: FiShoppingBag,
      tone: "text-warning",
    },
    {
      label: "Events Created",
      value: initialLogs.filter((log) => log.action.includes("EVENT")).length,
      icon: FiCalendar,
      tone: "text-primary",
    },
    {
      label: "Announcements",
      value: initialLogs.filter((log) => log.action.includes("ANNOUNCEMENT")).length,
      icon: FiFileText,
      tone: "text-destructive",
    },
  ];

  const filteredLogs = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return initialLogs.filter((log) => {
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
  }, [category, initialLogs, role, search, status, university]);

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
              Activity heatmap aggregation is not available yet.
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
