"use client";

import { CampusSearch } from "@/components/campushub";

type StudentSearchProps = {
  className?: string;
};

export function StudentSearch({ className }: StudentSearchProps) {
  return (
    <CampusSearch
      aria-label="Search student portal"
      className="bg-transparent"
      placeholder="Search student portal"
      type="search"
      wrapperClassName={className}
    />
  );
}
