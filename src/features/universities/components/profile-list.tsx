import { CalendarDays, ExternalLink } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import type {
  PublicUniversity,
} from "@/features/universities/lib/university-directory-service";

type PublicEvent = PublicUniversity["publicEvents"][number];
type PublicOpportunity = PublicUniversity["publicOpportunities"][number];

export function PublicEventList({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No public events yet"
        description="Public events will appear here when this university publishes real event records."
        className="mx-auto"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <article
          key={`${event.title}-${event.date}`}
          className="rounded-lg border border-border bg-background p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.date} · {event.location}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PublicOpportunityList({
  opportunities,
}: {
  opportunities: PublicOpportunity[];
}) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No public opportunities yet"
        description="Public opportunities will appear here when employers or university teams publish real records."
        className="mx-auto"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {opportunities.map((opportunity) => (
        <article
          key={`${opportunity.title}-${opportunity.deadline}`}
          className="rounded-lg border border-border bg-background p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{opportunity.title}</h3>
                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  {opportunity.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Deadline: {opportunity.deadline}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {opportunity.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
