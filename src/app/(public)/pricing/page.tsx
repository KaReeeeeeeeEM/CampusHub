import Link from "next/link";

import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/features/public-site/content";

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        image="/images/photography/professional-workplace.webp"
        title="Flexible pricing for universities and ecosystem partners."
        description="CampusHub pricing is shaped around institution size, rollout scope, stakeholder groups, and implementation needs."
      />
      <Section>
        <SectionInner>
          <SectionHeading
            align="center"
            eyebrow="Plans"
            title="Choose a launch model that matches your institution."
            description="Pricing is consultative while CampusHub prepares institutional launch packages and partner onboarding paths."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.featured
                    ? "premium-card rounded-lg border border-primary bg-surface p-6 shadow-sm hover:ring-1 hover:ring-primary/70"
                    : "premium-card rounded-lg border border-border bg-surface p-6 shadow-sm hover:ring-1 hover:ring-primary/50"
                }
              >
                {plan.featured ? (
                  <p className="mb-4 inline-flex rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Recommended
                  </p>
                ) : null}
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
                <p className="mt-6 text-3xl font-semibold text-primary">
                  {plan.price}
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-8 w-full"
                  variant={plan.featured ? "default" : "secondary"}
                >
                  <Link href="/contact">Request pricing</Link>
                </Button>
              </article>
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
