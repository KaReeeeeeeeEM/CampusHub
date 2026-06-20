"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FiMapPin } from "react-icons/fi";

import { cn } from "@/lib/utils";

type UniversityScopeBadgeProps = {
  universityId?: string | null;
  className?: string;
};

type UniversityScope = {
  id: string;
  name: string;
  shortName: string | null;
  country: string | null;
  region: string | null;
  logo: string | null;
};

type UniversityResponse = {
  data: {
    university: UniversityScope | null;
  } | null;
  error: unknown;
};

export function UniversityScopeBadge({
  universityId,
  className,
}: UniversityScopeBadgeProps) {
  const [university, setUniversity] = useState<UniversityScope | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(universityId));

  useEffect(() => {
    if (!universityId) {
      setUniversity(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadUniversity() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/me/university", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          setUniversity(null);
          return;
        }

        const payload = (await response.json()) as UniversityResponse;
        setUniversity(payload.data?.university ?? null);
      } catch {
        if (!controller.signal.aborted) {
          setUniversity(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadUniversity();

    return () => controller.abort();
  }, [universityId]);

  const location = useMemo(
    () => [university?.region, university?.country].filter(Boolean).join(", "),
    [university?.country, university?.region],
  );

  if (!universityId) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "h-9 w-44 animate-pulse rounded-md bg-surface-muted",
          className,
        )}
        aria-label="Loading university"
      />
    );
  }

  if (!university) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-9 max-w-[260px] items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 text-left",
        className,
      )}
      title={location ? `${university.name} · ${location}` : university.name}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-background text-primary">
        {university.logo ? (
          <Image
            src={university.logo}
            alt=""
            fill
            className="object-cover"
            sizes="24px"
          />
        ) : (
          <FiMapPin className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold leading-4 text-foreground">
          {university.shortName || university.name}
        </span>
        <span className="block truncate text-[10px] leading-3 text-muted-foreground">
          {university.name}
        </span>
      </span>
    </div>
  );
}
