import Link from "next/link";

import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";

const onboardingPaths = [
  {
    title: "Students",
    description:
      "Join through a College Representative invitation link that locks the correct university and college.",
  },
  {
    title: "Teachers and Representatives",
    description:
      "Join through Campus Admin invitations after institutional verification.",
  },
  {
    title: "Campus Admins",
    description:
      "Join through Super Admin invitations tied to university setup and governance.",
  },
  {
    title: "Employers",
    description:
      "Apply for verified employer access. Approved organizations receive activation invitations.",
  },
];

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Access CampusHub"
        image="/images/photography/landing-hero.webp"
        primaryHref="/employers/apply"
        primaryLabel="Employer application"
        secondaryHref="/features"
        secondaryLabel="Explore features"
        title="Access starts through verified onboarding."
        description="CampusHub no longer supports public user registration. Accounts originate through authorized invitations, institution workflows, or approved employer applications."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            eyebrow="Onboarding paths"
            title="Every account starts from a trusted source."
            description="This keeps student, staff, administrator, and employer access aligned with university records and platform governance."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {onboardingPaths.map((path) => (
              <article
                key={path.title}
                className="rounded-lg border border-border bg-surface p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold">{path.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {path.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/employers/apply">Apply as employer</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
