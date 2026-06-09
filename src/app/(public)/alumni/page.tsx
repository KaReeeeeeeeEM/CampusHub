import { MarketingCard } from "@/components/public/marketing-card";
import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";

const alumniBenefits = [
  {
    title: "Lifelong university connection",
    description:
      "Keep graduates connected to their institutions, communities, and shared opportunities.",
  },
  {
    title: "Mentorship and career growth",
    description:
      "Prepare alumni pathways for mentoring students, sharing opportunities, and strengthening employability.",
  },
  {
    title: "Giving and impact readiness",
    description:
      "Create the foundation for future alumni giving, campaigns, events, and institutional support.",
  },
];

export default function AlumniPage() {
  return (
    <>
      <PageHero
        eyebrow="For alumni"
        image="/images/photography/alumni-benefits.webp"
        title="Turn alumni communities into active university ecosystems."
        description="CampusHub helps institutions maintain meaningful relationships with graduates long after campus life ends."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            eyebrow="Alumni value"
            title="Build a living network of graduates, mentors, employers, and supporters."
            description="CampusHub is designed for long-term alumni identity, community, opportunity sharing, and future giving experiences."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {alumniBenefits.map((benefit) => (
              <MarketingCard key={benefit.title} {...benefit} />
            ))}
          </div>
        </SectionInner>
      </Section>
      <Section surface="surface">
        <SectionInner className="text-center">
          <SectionHeading
            align="center"
            title="Alumni access should be earned by academic history, not requested manually."
            description="CampusHub is designed to recognize graduates through verified university records, course timelines, and completion data so alumni experiences open automatically when a learner becomes eligible."
          />
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
            {[
              "Verified records",
              "Course completion",
              "Graduate lifecycle",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-background p-4 text-sm font-medium"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
