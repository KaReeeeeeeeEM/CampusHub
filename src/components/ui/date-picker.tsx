"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthLabels = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { month: "short" }).format(
    new Date(2026, index, 1),
  ),
);
const displayFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function parseDate(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sameDay(a: Date | null, b: Date) {
  return (
    a?.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return date;
  });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  fromYear = 1900,
  toYear = new Date().getFullYear(),
}: DatePickerProps) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    selectedDate ?? new Date(toYear, new Date().getMonth(), 1),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const yearOptions = useMemo(
    () =>
      Array.from(
        { length: toYear - fromYear + 1 },
        (_, index) => toYear - index,
      ),
    [fromYear, toYear],
  );
  const isFirstAvailableMonth =
    visibleMonth.getFullYear() === fromYear && visibleMonth.getMonth() === 0;
  const isLastAvailableMonth =
    visibleMonth.getFullYear() === toYear && visibleMonth.getMonth() === 11;

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
      );
    }
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target instanceof Element && target.closest("[data-campus-select-content]"))
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function shiftMonth(offset: number) {
    setVisibleMonth((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1,
      );

      if (next.getFullYear() < fromYear || next.getFullYear() > toYear) {
        return current;
      }

      return next;
    });
  }

  function setCalendarMonth(month: string) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), Number(month), 1),
    );
  }

  function setCalendarYear(year: string) {
    setVisibleMonth(
      (current) => new Date(Number(year), current.getMonth(), 1),
    );
  }

  function selectDate(date: Date) {
    onChange(serializeDate(date));
    setVisibleMonth(date);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "h-11 w-full justify-between bg-surface-muted px-3 text-left text-sm font-normal",
          !selectedDate && "text-muted-foreground",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          {selectedDate ? displayFormatter.format(selectedDate) : placeholder}
        </span>
        <FiCalendar className="h-4 w-4 opacity-70" aria-hidden="true" />
      </Button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[60] w-80 rounded-md border border-border-strong bg-surface p-3 text-foreground shadow-xl">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Previous month"
              disabled={isFirstAvailableMonth}
              onClick={() => shiftMonth(-1)}
            >
              <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Select
              value={String(visibleMonth.getMonth())}
              onValueChange={setCalendarMonth}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent searchable={false}>
                {monthLabels.map((label, index) => (
                  <SelectItem key={label} value={String(index)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(visibleMonth.getFullYear())}
              onValueChange={setCalendarYear}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent searchPlaceholder="Search year">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Next month"
              disabled={isLastAvailableMonth}
              onClick={() => shiftMonth(1)}
            >
              <FiChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const disabled =
                date.getFullYear() < fromYear || date.getFullYear() > toYear;
              const selected = sameDay(selectedDate, date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md text-sm transition hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-30",
                    !inMonth && "text-muted-foreground/45",
                    selected && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
