"use client";

import { Search } from "@/components/navigation/search";

type AlumniSearchProps = {
  className?: string;
};

export function AlumniSearch({ className }: AlumniSearchProps) {
  return <Search className={className} placeholder="Search alumni portal" />;
}
