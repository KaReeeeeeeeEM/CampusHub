"use client";

import { CampusSearch } from "@/components/campushub";

type SearchProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function Search({
  value = "",
  placeholder = "Search",
  onChange,
  className,
}: SearchProps) {
  return (
    <CampusSearch
      className="bg-transparent"
      placeholder={placeholder}
      type="search"
      value={value}
      wrapperClassName={className}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
