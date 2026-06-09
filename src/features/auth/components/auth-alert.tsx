import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthAlertProps = {
  type: "error" | "success" | "info";
  title?: string;
  message: string;
};

export function AuthAlert({ type, title, message }: AuthAlertProps) {
  const Icon =
    type === "error" ? AlertCircle : type === "info" ? Info : CheckCircle2;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border p-3 text-sm",
        type === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        type === "success" && "border-success/30 bg-success/10 text-foreground",
        type === "info" && "border-info/30 bg-info/10 text-foreground",
      )}
      role={type === "error" ? "alert" : "status"}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          type === "error" && "text-destructive",
          type === "success" && "text-success",
          type === "info" && "text-info",
        )}
        aria-hidden="true"
      />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <p className={title ? "mt-1" : undefined}>{message}</p>
      </div>
    </div>
  );
}
