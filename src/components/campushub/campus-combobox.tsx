"use client";

import { useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";

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
  className?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
};

export function CampusCombobox({
  value,
  options,
  className,
  placeholder = "Select option",
  searchPlaceholder,
  emptyMessage = "No results found.",
  disabled,
  invalid,
  onChange,
}: CampusComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;
  const searchSubject = inferSearchSubject(options);

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
      className={cn("relative", className)}
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
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <FiChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-surface p-2 shadow-lg">
          <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <FiSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
            <CampusInput
              autoFocus
              className="h-full border-0 px-0 focus:ring-0"
              placeholder={searchPlaceholder ?? `Search ${searchSubject}`}
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
                    <FiCheck
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
                {query.trim()
                  ? `No search results for "${query.trim()}".`
                  : emptyMessage}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function inferSearchSubject(options: CampusComboboxOption[]) {
  const text = options.map((option) => option.label).join(" ").toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/universit/, "universities"],
    [/college/, "colleges"],
    [/department/, "departments"],
    [/campus admin/, "campus admins"],
    [/student/, "students"],
    [/teacher/, "teachers"],
    [/employer/, "employers"],
    [/alumni/, "alumni"],
    [/committee/, "committees"],
    [/announcement/, "announcements"],
    [/event/, "events"],
    [/poll/, "polls"],
    [/suggestion/, "suggestions"],
    [/project/, "projects"],
    [/market|product|shop/, "marketplace records"],
    [/report/, "reports"],
    [/role/, "roles"],
    [/status|active|inactive|pending|published|draft/, "statuses"],
    [/categor/, "categories"],
    [/type|public|private/, "types"],
    [/range|today|days|year|custom/, "date ranges"],
  ];

  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? "options";
}
