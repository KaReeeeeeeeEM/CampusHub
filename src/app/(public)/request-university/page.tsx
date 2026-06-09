import { PageHero } from "@/components/public/page-hero";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { RequestUniversityForm } from "@/features/universities/components/request-university-form";

export default function RequestUniversityPage() {
  return (
    <>
      <PageHero
        eyebrow="Request university"
        image="/images/photography/university-benefits.webp"
        primaryHref="/universities"
        primaryLabel="Browse listed universities"
        secondaryHref="/join-university"
        secondaryLabel="Join university"
        title="Request a new university on CampusHub."
        description="If your institution is not listed yet, submit a request so CampusHub can review it for future onboarding."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="University request"
            title="Help us identify institutions to onboard next."
            description="Requests can come from students, staff, alumni, employers, administrators, and ecosystem partners."
          />
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <RequestUniversityForm />
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
