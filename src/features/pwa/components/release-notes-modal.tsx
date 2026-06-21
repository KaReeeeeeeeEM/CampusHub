"use client";

import { useEffect, useRef } from "react";
import { FiCheckCircle, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { CAMPUSHUB_RELEASE } from "@/features/pwa/lib/release-notes";
import { KiboVideo } from "@/lib/kibo";

type ReleaseNotesModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ReleaseNotesModal({ open, onClose }: ReleaseNotesModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    modalRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 shadow-2xl focus:outline-none"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0">
              <KiboVideo animation="announcement" autoplay loop={false} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                CampusHub {CAMPUSHUB_RELEASE.version}
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {CAMPUSHUB_RELEASE.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Released {CAMPUSHUB_RELEASE.date}
              </p>
            </div>
          </div>
          <Button
            aria-label="Close release notes"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <FiX className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {CAMPUSHUB_RELEASE.notes.map((note) => (
            <div
              key={note.title}
              className="flex gap-3 rounded-lg border border-border bg-background p-3"
            >
              <FiCheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold">{note.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {note.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
