"use client";

import { FiSearch } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";

type SearchProps = {
  placeholder?: string;
  className?: string;
};

export function Search({ placeholder = "Search", className }: SearchProps) {
  const setCommandOpen = useNavigationStore((state) => state.setCommandOpen);

  return (
    <Button
      aria-label="Open universal search"
      className={cn(
        "h-10 justify-start rounded-md border border-border bg-background/70 px-3 text-muted-foreground shadow-sm hover:border-border-strong hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      type="button"
      variant="ghost"
      onClick={() => setCommandOpen(true)}
    >
      <FiSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left text-sm">
        {placeholder}
      </span>
      <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
        Ctrl K / ⌘ K
      </kbd>
    </Button>
  );
}
