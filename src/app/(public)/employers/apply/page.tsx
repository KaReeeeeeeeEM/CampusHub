import { EmployerApplicationForm } from "@/features/employer-applications/components/employer-application-form";
import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";

export default function EmployerApplyPage() {
  return (
    <>
      <PageHero
        eyebrow="Employer application"
        image="/images/photography/employer-benefits.webp"
        title="Apply for verified employer access."
        description="Employer accounts are approved before activation so universities, students, and graduates interact with trusted organizations."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="Access review"
            title="Tell CampusHub about your organization."
            description="Super Admins review employer applications before generating an activation invitation. Employer accounts cannot be combined with student, teacher, representative, campus admin, or alumni roles."
          />
          <EmployerApplicationForm />
        </SectionInner>
      </Section>
    </>
  );
}
