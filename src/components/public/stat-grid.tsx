import { AnimatedCounter } from "@/components/motion/animated-counter";
import { platformStats } from "@/features/public-site/content";

export function StatGrid() {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {platformStats.map((stat) => (
        <div
          key={stat.label}
          className="premium-card rounded-lg border border-border bg-background p-6 text-center shadow-sm"
        >
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className="mt-2 text-3xl font-semibold text-primary">
            <AnimatedCounter value={stat.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
