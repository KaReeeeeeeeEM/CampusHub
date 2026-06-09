import { PageHero } from "@/components/public/page-hero";
import { Section, SectionHeading, SectionInner } from "@/components/public/section";
import { faqs } from "@/features/public-site/content";

export default function FAQPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        image="/images/photography/library-study.webp"
        title="Questions about CampusHub."
        description="Find answers about the platform model, stakeholders, rollout approach, and future expansion paths."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Frequently asked questions"
            title="What institutions and partners usually ask first."
          />
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-lg border border-border bg-surface">
            {faqs.map((faq) => (
              <details key={faq.question} className="group p-6">
                <summary className="cursor-pointer list-none text-base font-semibold">
                  {faq.question}
                </summary>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
