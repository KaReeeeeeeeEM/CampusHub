import Link from "next/link";

import { PageHero } from "@/components/public/page-hero";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { StatGrid } from "@/components/public/stat-grid";
import { Button } from "@/components/ui/button";
import { UniversityDiscovery } from "@/features/universities/components/university-discovery";
import { universities } from "@/features/universities/lib/mock-data";

export default function UniversitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="University discovery"
        image="/images/photography/university-benefits.webp"
        primaryHref="/join-university"
        primaryLabel="Join a university"
        secondaryHref="/request-university"
        secondaryLabel="Request university"
        title="Find and join universities on CampusHub."
        description="Browse participating institutions, explore public university profiles, and request access to your campus ecosystem."
      />

      <Section>
        <SectionInner>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Browse universities"
              title="Search institutions by name, location, status, or academic focus."
              description="These realistic mock profiles show how CampusHub will present university discovery, public opportunities, and joining flows."
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/join-university">Join university</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/request-university">Request new university</Link>
              </Button>
            </div>
          </div>
          <div className="mt-10">
            <UniversityDiscovery universities={universities} />
          </div>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Discovery scale"
            title="A public entry point for multi-university growth."
            description="CampusHub discovery is designed to help students, staff, alumni, employers, and partners find the right institutional ecosystem."
          />
          <div className="mt-10">
            <StatGrid />
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
