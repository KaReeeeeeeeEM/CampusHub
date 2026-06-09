import { Suspense } from "react";

import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { LoadingState } from "@/components/shared/loading-state";
import { JoinUniversityForm } from "@/features/universities/components/join-university-form";
import { universities } from "@/features/universities/lib/mock-data";

export default function JoinUniversityPage() {
  return (
    <>
      <PageHero
        eyebrow="Join university"
        image="/images/photography/university-benefits.webp"
        primaryHref="/universities"
        primaryLabel="Browse universities"
        secondaryHref="/request-university"
        secondaryLabel="Request university"
        title="Request access to your university ecosystem."
        description="Join your institution on CampusHub as a student, teacher, representative, employer, or administrator. Alumni access is determined from verified academic history and course completion timelines."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="Join request"
            title="Submit your university relationship for verification."
            description="CampusHub will use this information to prepare tenant access, role assignment, and future onboarding workflows."
          />
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <Suspense fallback={<LoadingState label="Loading join form" />}>
              <JoinUniversityForm universities={universities} />
            </Suspense>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
