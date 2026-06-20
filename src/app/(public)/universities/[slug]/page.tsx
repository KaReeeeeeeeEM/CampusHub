import { ArrowLeft, Building2, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";
import {
  PublicEventList,
  PublicOpportunityList,
} from "@/features/universities/components/profile-list";
import {
  getPublicUniversityBySlug,
  listPublicUniversities,
} from "@/features/universities/lib/university-directory-service";

type UniversityProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const universities = await listPublicUniversities();

  return universities.map((university) => ({
    slug: university.slug,
  }));
}

export async function generateMetadata({ params }: UniversityProfilePageProps) {
  const { slug } = await params;
  const university = await getPublicUniversityBySlug(slug);

  if (!university) {
    return {
      title: "University not found",
    };
  }

  return {
    title: `${university.name} | CampusHub`,
    description: university.description,
  };
}

export default async function UniversityProfilePage({
  params,
}: UniversityProfilePageProps) {
  const { slug } = await params;
  const university = await getPublicUniversityBySlug(slug);

  if (!university) {
    notFound();
  }

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <Image
          priority
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          fill
          src={university.image}
          sizes="100vw"
        />
        <div className="absolute inset-0 -z-10 bg-black/64" />
        <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-end px-4 py-16 text-white sm:px-6 lg:px-8">
          <Link
            className="mb-8 inline-flex w-fit items-center gap-2 text-sm text-zinc-200 hover:text-white"
            href="/universities"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to universities
          </Link>
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-md px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: university.brandColor }}
              >
                {university.shortName}
              </span>
              <span className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs">
                {university.status}
              </span>
              <span className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs">
                {university.type}
              </span>
            </div>
            <h1 className="campushub-hero-headline mt-5 text-4xl font-semibold tracking-normal sm:text-6xl">
              {university.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-200">
              {university.tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-zinc-200">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                {university.city}, {university.country}
              </span>
              <span className="flex items-center gap-2">
                <Building2
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                {university.founded ? `Created ${university.founded}` : "Founded date not set"}
              </span>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/join">Invitation enrollment</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/contact">Contact CampusHub</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <SectionHeading
            eyebrow="Profile"
            title="Branding and institutional overview."
            description={university.description}
          />
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-sm font-semibold">Brand system</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Primary</p>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-md border border-border"
                    style={{ backgroundColor: university.brandColor }}
                  />
                  <span className="text-sm">{university.brandColor}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accent</p>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-md border border-border"
                    style={{ backgroundColor: university.accentColor }}
                  />
                  <span className="text-sm">{university.accentColor}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner>
          <SectionHeading
            eyebrow="Colleges"
            title="Academic structure."
            description="Public college listings help students, staff, alumni, and employers understand where they belong in the university ecosystem."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {university.colleges.length > 0 ? (
              university.colleges.map((college) => (
                <div
                  key={college}
                  className="rounded-lg border border-border bg-background p-5 font-medium"
                >
                  {college}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
                No public college records have been added for this university yet.
              </div>
            )}
          </div>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Statistics"
            title="Public institutional signals."
          />
          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {university.stats.length > 0 ? (
              university.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-surface p-6 text-center"
                >
                  <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-2 text-3xl font-semibold text-primary">
                    {stat.value}
                  </dd>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
                No public statistics are available yet.
              </div>
            )}
          </dl>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Public events"
              title="Open campus activities."
              description="Public events are shown only when real university event records exist."
            />
            <div className="mt-8">
              <PublicEventList events={university.publicEvents} />
            </div>
          </div>
          <div>
            <SectionHeading
              eyebrow="Public opportunities"
              title="Visible opportunities."
              description="Public opportunities are shown only when real opportunity records exist."
            />
            <div className="mt-8">
              <PublicOpportunityList
                opportunities={university.publicOpportunities}
              />
            </div>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
