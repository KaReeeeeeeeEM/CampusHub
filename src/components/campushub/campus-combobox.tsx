"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { CampusInput } from "@/components/campushub/campus-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CampusComboboxOption = {
  label: string;
  value: string;
};

type CampusComboboxProps = {
  value: string;
  options: CampusComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
};

export function CampusCombobox({
  value,
  options,
  placeholder = "Select option",
  searchPlaceholder = "Search",
  emptyMessage = "No results found.",
  invalid,
  onChange,
}: CampusComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) {
          close();
        }
      }}
    >
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "h-11 w-full justify-between border bg-background px-3 text-left font-normal text-foreground hover:bg-background",
          invalid ? "border-destructive" : "border-border",
          !selected && "text-muted-foreground",
        )}
        type="button"
        variant="secondary"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronsUpDown
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-surface p-2 shadow-lg">
          <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <CampusInput
              autoFocus
              className="h-full border-0 px-0 focus:ring-0"
              placeholder={searchPlaceholder}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div
            className="mt-2 max-h-64 overflow-y-auto"
            role="listbox"
            tabIndex={-1}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const active = option.value === value;

                return (
                  <Button
                    key={option.value}
                    className={cn(
                      "h-auto w-full justify-start rounded-md px-3 py-2 text-left text-sm font-normal",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-background",
                    )}
                    role="option"
                    type="button"
                    variant="ghost"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      close();
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{option.label}</span>
                  </Button>
                );
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
