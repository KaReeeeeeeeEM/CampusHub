import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Skeleton } from "./skeleton";

type CardSkeletonProps = {
  className?: string;
};

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <Card className={cn("dashboard-card min-h-[104px]", className)}>
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="mt-5 space-y-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
