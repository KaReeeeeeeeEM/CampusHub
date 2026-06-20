import Link from "next/link";

import { PublicLogo } from "@/components/public/public-logo";
import { AuthVisualStory } from "@/features/auth/components/auth-visual-story";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_0.9fr]">
      <section className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <PublicLogo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Back to public website
          </Link>
        </div>
      </section>
      <AuthVisualStory />
    </div>
  );
}
