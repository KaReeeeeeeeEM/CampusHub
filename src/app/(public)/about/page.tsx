import Image from "next/image";

import { PageHero } from "@/components/public/page-hero";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { MarketingCard } from "@/components/public/marketing-card";
import { keyBenefits } from "@/features/public-site/content";

const principles = [
  "Universities need ecosystems, not isolated tools.",
  "Students should have one trusted digital campus identity.",
  "Employability, alumni, and institutional engagement belong together.",
  "Every rollout must respect governance, security, and scale."
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About CampusHub"
        image="/images/photography/landing-hero.webp"
        title="A long-term digital ecosystem for modern universities."
        description="CampusHub is being built to help institutions connect the people, services, opportunities, and relationships that define university life."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Mission"
            title="Make campus ecosystems more connected, visible, and valuable."
            description="CampusHub gives universities a scalable digital foundation for stakeholder engagement, student success, alumni relationships, employer access, and future digital services."
          />
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-surface">
            <Image
              alt="CampusHub ecosystem visual"
              className="h-full w-full object-cover"
              fill
              src="/images/photography/students-collaborating.webp"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        </SectionInner>
      </Section>
      <Section surface="surface">
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Principles"
            title="Built around institutional trust."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {principles.map((principle) => (
              <div
                key={principle}
                className="rounded-lg border border-border bg-background p-6 text-base font-medium"
              >
                {principle}
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>
      <Section>
        <SectionInner>
          <SectionHeading
            eyebrow="Why now"
            title="Higher education needs a stronger digital relationship layer."
            description="Students, employers, and alumni already operate digitally. CampusHub gives universities a premium way to own that relationship and build future services from a unified foundation."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {keyBenefits.map((benefit) => (
              <MarketingCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
