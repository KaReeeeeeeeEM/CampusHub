"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PublicLogo } from "@/components/public/public-logo";
import { Button } from "@/components/ui/button";
import { publicNavItems } from "@/features/public-site/content";
import { cn } from "@/lib/utils";

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const solid = scrolled || open;

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 32);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid
          ? "border-b border-border bg-background/92 text-foreground shadow-sm backdrop-blur-xl"
          : "bg-transparent text-white",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
        <PublicLogo />
        <nav className="ml-8 hidden items-center gap-1 lg:flex">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "nav-link rounded-md px-3 py-2 text-sm transition-all duration-300",
                solid
                  ? "text-muted-foreground hover:bg-surface hover:text-foreground"
                  : "text-white/78 hover:bg-white/10 hover:text-white",
                pathname === item.href &&
                  (solid
                    ? "bg-surface text-foreground"
                    : "bg-white/10 text-white"),
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button
            asChild
            className={
              solid
                ? undefined
                : "text-white hover:bg-white/10 hover:text-white"
            }
            data-magnetic
            variant="ghost"
          >
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild data-magnetic>
            <Link href="/employers/apply">Employer Apply</Link>
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Button
            aria-label={open ? "Close navigation" : "Open navigation"}
            className={
              solid
                ? undefined
                : "text-white hover:bg-white/10 hover:text-white"
            }
            size="icon"
            variant="ghost"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 text-foreground shadow-lg lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
                href={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button asChild data-magnetic variant="secondary">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild data-magnetic>
                <Link href="/employers/apply">Apply</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
