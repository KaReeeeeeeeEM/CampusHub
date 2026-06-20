"use client";

import { Search } from "@/components/navigation/search";

type TeacherSearchProps = {
  className?: string;
};

export function TeacherSearch({ className }: TeacherSearchProps) {
  return <Search className={className} placeholder="Search teacher portal" />;
}
