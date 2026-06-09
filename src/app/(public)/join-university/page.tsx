import Link from "next/link";

import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";

export default function JoinUniversityPage() {
  return (
    <>
      <PageHero
        eyebrow="Invitation enrollment"
        image="/images/photography/university-benefits.webp"
        primaryHref="/join"
        primaryLabel="Enrollment model"
        secondaryHref="/contact"
        secondaryLabel="Contact CampusHub"
        title="Students join through verified invitation links."
        description="CampusHub no longer supports manual university self-selection. Authorized college representatives generate invitation links that automatically connect students to the right university and college."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="How access works"
            title="Ask your college representative for your CampusHub invitation."
            description="Invitation links carry university, college, representative, expiry, usage limit, and status metadata. When a student registers through the link, CampusHub locks the university and college fields automatically."
          />
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="space-y-5 text-sm leading-6 text-muted-foreground">
              <p>
                If you are a student, do not search for or manually select your
                university. Use the invitation URL provided by your authorized
                college representative.
              </p>
              <p>
                If you are a university or college representative, invitation
                management is handled through the CampusHub representative
                workflow and API foundation.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/contact">Contact CampusHub</Link>
              </Button>
            </div>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
