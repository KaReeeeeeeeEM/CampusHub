"use client";

import { Search } from "@/components/navigation/search";

type StudentSearchProps = {
  className?: string;
};

export function StudentSearch({ className }: StudentSearchProps) {
  return <Search className={className} placeholder="Search student portal" />;
}
