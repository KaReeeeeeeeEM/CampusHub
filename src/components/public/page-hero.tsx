import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  primaryHref = "/join",
  primaryLabel = "Join CampusHub",
  secondaryHref = "/contact",
  secondaryLabel = "Contact us",
}: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-background">
      <Image
        priority
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        fill
        src={image}
        sizes="100vw"
      />
      <div className="absolute inset-0 -z-10 bg-black/62" />
      <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-end px-4 pb-20 pt-48 text-white sm:px-6 sm:pt-52 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            {eyebrow}
          </p>
          <h1 className="campushub-hero-headline mt-4 text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
