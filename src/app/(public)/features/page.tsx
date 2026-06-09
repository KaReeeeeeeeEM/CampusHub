import { PageHero } from "@/components/public/page-hero";
import { MarketingCard } from "@/components/public/marketing-card";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { features } from "@/features/public-site/content";

const roadmap = [
  "Campus identity and role-based access",
  "Student engagement and representative workflows",
  "Employer and opportunity ecosystem",
  "Alumni community, mentoring, and giving readiness",
  "Marketplace, wallet, AI, and mobile expansion"
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Features"
        image="/images/photography/students-collaborating.webp"
        title="A foundation for the complete university ecosystem."
        description="CampusHub starts with a secure multi-stakeholder platform and expands into the modules universities need for engagement, employability, alumni, and digital services."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            eyebrow="Platform capabilities"
            title="Designed as a scalable ecosystem, not a single department tool."
            description="Every capability is shaped to support multi-university growth, multiple roles, and future module expansion."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <MarketingCard key={feature.title} {...feature} />
            ))}
          </div>
        </SectionInner>
      </Section>
      <Section surface="surface">
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Roadmap readiness"
            title="Prepared for the modules CampusHub will grow into."
          />
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-lg border border-border bg-background">
            {roadmap.map((item, index) => (
              <div key={item} className="flex gap-4 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
