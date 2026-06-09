import Link from "next/link";

import { MarketingCard } from "@/components/public/marketing-card";
import { PageHero } from "@/components/public/page-hero";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { Button } from "@/components/ui/button";

const employerBenefits = [
  {
    title: "Verified talent access",
    description:
      "Build future hiring pipelines through structured relationships with university communities."
  },
  {
    title: "Campus brand presence",
    description:
      "Position your organization in front of students and graduates through trusted university channels."
  },
  {
    title: "Partnership readiness",
    description:
      "Prepare for future recruiting, internships, events, marketplace, and employer service modules."
  }
];

export default function EmployersPage() {
  return (
    <>
      <PageHero
        eyebrow="For employers"
        image="/images/photography/employer-benefits.webp"
        title="Connect with emerging talent through trusted campus ecosystems."
        description="CampusHub creates a structured bridge between employers, universities, students, and graduates."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            eyebrow="Employer value"
            title="Move beyond one-off recruiting into long-term university relationships."
            description="CampusHub is designed to help employers build visibility, credibility, and repeatable access to student and graduate communities."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {employerBenefits.map((benefit) => (
              <MarketingCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </SectionInner>
      </Section>
      <Section surface="surface">
        <SectionInner className="text-center">
          <SectionHeading
            align="center"
            title="Build your campus talent pipeline with CampusHub."
            description="Register employer interest and prepare for future opportunities, recruiting workflows, and university partnerships."
          />
          <Button asChild className="mt-8">
            <Link href="/join">Join as an employer</Link>
          </Button>
        </SectionInner>
      </Section>
    </>
  );
}
