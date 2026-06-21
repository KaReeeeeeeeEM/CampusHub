"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type, disabled, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && passwordVisible ? "text" : type;
    const PasswordIcon = passwordVisible ? EyeOff : Eye;

    const input = (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-md border bg-surface-muted px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
          isPassword ? "pr-11" : null,
          invalid ? "border-destructive" : "border-border",
          className,
        )}
        aria-invalid={invalid || props["aria-invalid"]}
        disabled={disabled}
        type={inputType}
        {...props}
      />
    );

    if (!isPassword) {
      return input;
    }

    return (
      <div className="relative w-full">
        {input}
        <button
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setPasswordVisible((visible) => !visible)}
          type="button"
        >
          <PasswordIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  },
);

Input.displayName = "Input";
