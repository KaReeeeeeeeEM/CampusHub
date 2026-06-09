import { CheckCircle2, Circle } from "lucide-react";

const rules = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
  { label: "Symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) }
];

export function getPasswordStrength(password: string) {
  return rules.filter((rule) => rule.test(password)).length;
}

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-3">
      {rules.map((rule) => {
        const passed = rule.test(password);
        const Icon = passed ? CheckCircle2 : Circle;

        return (
          <div
            key={rule.label}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Icon
              className={passed ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5"}
              aria-hidden="true"
            />
            {rule.label}
          </div>
        );
      })}
    </div>
  );
}
