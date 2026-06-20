"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import * as React from "react";
import { FiCheck, FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";

import { cn } from "@/lib/utils";

const SelectSearchContext = React.createContext("");

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 w-full items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <FiChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <FiChevronUp className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <FiChevronDown className="h-4 w-4" aria-hidden="true" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
> & {
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsMessage?: string;
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = "popper",
      searchable = true,
      searchPlaceholder,
      noResultsMessage,
      ...props
    },
    ref,
  ) => {
    const [query, setQuery] = React.useState("");
    const normalizedQuery = query.trim().toLowerCase();
    const searchEntries = React.useMemo(
      () => getSearchableEntries(children),
      [children],
    );
    const searchSubject = inferSearchSubject(searchEntries);
    const hasSearchResults =
      !normalizedQuery ||
      searchEntries.some((entry) => entry.searchText.includes(normalizedQuery));
    const emptyMessage =
      noResultsMessage ??
      `No search results for "${query.trim()}".`;

    return (
      <SelectSearchContext.Provider value={normalizedQuery}>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            ref={ref}
            className={cn(
              "relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border border-border-strong bg-surface text-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              position === "popper" &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
              className,
            )}
            position={position}
            {...props}
          >
            {searchable ? (
              <div className="border-b border-border p-2">
                <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                  <FiSearch
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    autoComplete="off"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder={searchPlaceholder ?? `Search ${searchSubject}`}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
              </div>
            ) : null}
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
              className={cn(
                "max-h-72 p-1",
                position === "popper" &&
                  "w-full min-w-[var(--radix-select-trigger-width)]",
              )}
            >
              {hasSearchResults ? (
                children
              ) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </p>
              )}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectSearchContext.Provider>
    );
  },
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

function getTextContent(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return getTextContent(child.props.children);
      }

      return "";
    })
    .join(" ")
    .trim();
}

function getSearchableEntries(children: React.ReactNode): Array<{
  label: string;
  searchText: string;
}> {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ children?: React.ReactNode; value?: string }>(
      child,
    )) {
      return [];
    }

    if (typeof child.props.value === "string") {
      const label = getTextContent(child.props.children);

      return [
        {
          label,
          searchText: `${label} ${child.props.value}`.toLowerCase(),
        },
      ];
    }

    return getSearchableEntries(child.props.children);
  });
}

function inferSearchSubject(
  entries: Array<{
    label: string;
    searchText: string;
  }>,
) {
  const text = entries.map((entry) => entry.label).join(" ").toLowerCase();
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

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, value, ...props }, ref) => {
  const query = React.useContext(SelectSearchContext);
  const searchText = `${getTextContent(children)} ${value}`.toLowerCase();

  if (query && !searchText.includes(query)) {
    return null;
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      value={value}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <FiCheck className="h-4 w-4" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
