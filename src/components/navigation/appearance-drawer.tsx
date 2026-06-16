"use client";

import { useMemo, useState } from "react";
import { FiCheck, FiExternalLink, FiSearch } from "react-icons/fi";
import { MdOutlinePalette } from "react-icons/md";

import { Drawer } from "@/components/shared/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appearancePalettes } from "@/constants/appearance";
import { cn } from "@/lib/utils";
import { useAppearanceStore } from "@/store/appearance-store";

type AppearanceDrawerProps = {
  className?: string;
};

export function AppearanceDrawer({ className }: AppearanceDrawerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const paletteId = useAppearanceStore((state) => state.paletteId);
  const setPaletteId = useAppearanceStore((state) => state.setPaletteId);

  const filteredPalettes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return appearancePalettes;
    }

    return appearancePalettes.filter((palette) => {
      const searchable = `${palette.name} ${palette.description}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [query]);

  return (
    <>
      <div className="group relative">
        <Button
          aria-label="Customize appearance"
          className={className}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
        >
          <MdOutlinePalette className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-foreground" />
          Appearance
        </span>
      </div>

      <Drawer
        className="max-w-[390px] bg-background p-5"
        description="Customize the look and feel of the app."
        open={open}
        title="Appearance"
        onOpenChange={setOpen}
      >
        <div className="space-y-5">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="h-11 rounded-lg border-border bg-surface pl-9 shadow-none focus-visible:ring-primary"
              placeholder="Search themes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredPalettes.map((palette) => {
              const selected = palette.id === paletteId;

              return (
                <Button
                  className={cn(
                    "h-auto items-stretch justify-start rounded-lg border border-border bg-surface p-2 text-left text-foreground shadow-none hover:border-primary/50 hover:bg-surface-muted",
                    selected &&
                      "border-primary bg-primary/5 ring-1 ring-primary/30 hover:border-primary",
                  )}
                  key={palette.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setPaletteId(palette.id)}
                >
                  <span className="flex w-full flex-col gap-2">
                    <span className="relative flex h-16 rounded-md bg-surface-muted p-2">
                      <span
                        className="mr-2 h-full w-4 rounded-md"
                        style={{
                          background: `color-mix(in srgb, ${palette.primary} 16%, transparent)`,
                        }}
                      />
                      <span className="mt-auto grid flex-1 gap-1">
                        <span
                          className="h-2.5 rounded-full"
                          style={{ backgroundColor: palette.preview[0] }}
                        />
                        <span className="grid grid-cols-2 gap-1">
                          <span
                            className="h-2.5 rounded-full"
                            style={{ backgroundColor: palette.preview[1] }}
                          />
                          <span
                            className="h-2.5 rounded-full"
                            style={{ backgroundColor: palette.preview[2] }}
                          />
                        </span>
                      </span>
                      {selected ? (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <FiCheck className="h-3 w-3" aria-hidden="true" />
                        </span>
                      ) : null}
                    </span>
                    <span className="space-y-0.5 px-1 pb-1">
                      <span className="block text-sm font-semibold leading-tight">
                        {palette.name}
                      </span>
                      <span className="line-clamp-1 block text-xs leading-tight text-muted-foreground">
                        {palette.description}
                      </span>
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>

          {filteredPalettes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold">No palettes found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try another theme name or color direction.
              </p>
            </div>
          ) : null}
        </div>

        <div className="-mx-5 mt-6 flex items-center justify-between border-t border-border px-5 pt-4 text-sm text-muted-foreground">
          <span>Powered by TweakCN</span>
          <a
            className="inline-flex items-center gap-1 text-foreground transition-colors hover:text-primary"
            href="https://tweakcn.com"
            rel="noreferrer"
            target="_blank"
          >
            Explore
            <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </Drawer>
    </>
  );
}
