import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketingCardProps = {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  points?: string[];
  href?: string;
  className?: string;
};

export function MarketingCard({
  title,
  description,
  icon: Icon,
  points,
  href,
  className
}: MarketingCardProps) {
  return (
    <article
      className={cn(
        "premium-card rounded-lg border border-border bg-background p-6 shadow-sm",
        className
      )}
    >
      {Icon ? (
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      {points ? (
        <ul className="mt-5 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {href ? (
        <Button asChild className="mt-6" variant="secondary">
          <Link href={href}>Learn more</Link>
        </Button>
      ) : null}
    </article>
  );
}
