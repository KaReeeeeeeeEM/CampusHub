import { FiSearch } from "react-icons/fi";

import {
  CampusInput,
  type InputProps,
} from "@/components/campushub/campus-input";
import { cn } from "@/lib/utils";

type CampusSearchProps = InputProps & {
  wrapperClassName?: string;
};

export function CampusSearch({
  className,
  wrapperClassName,
  ...props
}: CampusSearchProps) {
  return (
    <label
      className={cn(
        "flex h-10 items-center gap-2 rounded-md border border-border bg-surface-muted px-3 text-sm text-muted-foreground transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/25",
        wrapperClassName,
      )}
    >
      <FiSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
      <CampusInput
        className={cn(
          "h-full border-0 bg-transparent px-0 focus:ring-0",
          className,
        )}
        {...props}
      />
    </label>
  );
}
