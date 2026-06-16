"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActivityDatum = {
  label: string;
  primary: number;
  secondary: number;
};

type DonutDatum = {
  name: string;
  value: number;
  color: string;
};

type GoalDatum = {
  label: string;
  value: number;
  detail: string;
  color: string;
};

function DashboardWidgetCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("dashboard-card", className)}>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base leading-tight">{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function ChartFrame({
  children,
  className = "h-64",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={className}>
      {mounted ? (
        children
      ) : (
        <div className="h-full w-full rounded-lg bg-surface-muted" />
      )}
    </div>
  );
}

export function SquareBarChartPanel({
  title,
  subtitle,
  data,
  primaryLabel,
  secondaryLabel,
}: {
  title: string;
  subtitle: string;
  data: ActivityDatum[];
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <DashboardWidgetCard title={title} subtitle={subtitle}>
      <ChartFrame>
        <ResponsiveContainer
          height="100%"
          minHeight={1}
          minWidth={1}
          width="100%"
        >
          <BarChart data={data} barGap={8}>
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{
                fill: "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
              contentStyle={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
            <Bar
              dataKey="primary"
              fill="var(--chart-tertiary)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="secondary"
              fill="var(--chart-secondary)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="mt-4 flex justify-center gap-5 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-tertiary)]" />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-secondary)]" />
          {secondaryLabel}
        </span>
      </div>
    </DashboardWidgetCard>
  );
}

export function SquareDonutChartPanel({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: DonutDatum[];
}) {
  return (
    <DashboardWidgetCard title={title} subtitle={subtitle}>
      <ChartFrame>
        <ResponsiveContainer
          height="100%"
          minHeight={1}
          minWidth={1}
          width="100%"
        >
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={58} outerRadius={92}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
        {data.map((item) => (
          <span key={item.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name} {item.value}
          </span>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}

export function SquareGoalsPanel({
  title,
  subtitle,
  goals,
}: {
  title: string;
  subtitle: string;
  goals: GoalDatum[];
}) {
  return (
    <DashboardWidgetCard title={title} subtitle={subtitle}>
      <div className="space-y-5">
        {goals.map((goal) => (
          <div key={goal.label} className="flex items-center gap-4">
            <ChartFrame className="h-16 w-16">
              <ResponsiveContainer
                height="100%"
                minHeight={1}
                minWidth={1}
                width="100%"
              >
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  data={[{ value: goal.value, fill: goal.color }]}
                  endAngle={-270}
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={90}
                >
                  <RadialBar dataKey="value" background cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{goal.label}</p>
              <p className="text-xs text-muted-foreground">{goal.detail}</p>
            </div>
            <span className="ml-auto text-sm font-semibold">{goal.value}%</span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
