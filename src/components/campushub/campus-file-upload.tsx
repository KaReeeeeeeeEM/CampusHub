"use client";

import { useRef, useState } from "react";
import { FiImage, FiUpload, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CampusFileUploadProps = {
  label: string;
  value?: string | null;
  accept?: string;
  maxSizeMb?: number;
  onValueChange: (value: string) => void;
  error?: string;
  className?: string;
};

export function CampusFileUpload({
  label,
  value,
  accept = "image/*",
  maxSizeMb = 1.5,
  onValueChange,
  error,
  className,
}: CampusFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLocalError("Upload an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`Image must be ${maxSizeMb}MB or smaller.`);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setLocalError(null);
      onValueChange(String(reader.result ?? ""));
      event.target.value = "";
    };
    reader.onerror = () => {
      setLocalError("Unable to read this image.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      <div className="rounded-md border border-border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiImage className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {value ? "Image selected" : "No image selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or WEBP. Max {maxSizeMb}MB.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {value ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onValueChange("")}
              >
                <FiX className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              <FiUpload className="h-4 w-4" aria-hidden="true" />
              Upload
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={handleFileChange}
      />
      {error || localError ? (
        <p className="text-xs text-destructive">{error ?? localError}</p>
      ) : null}
    </div>
  );
}
