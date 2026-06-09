import Image from "next/image";
import Link from "next/link";

import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ImmersiveStoryHero } from "@/components/public/immersive-story-hero";
import { MarketingCard } from "@/components/public/marketing-card";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { StatGrid } from "@/components/public/stat-grid";
import { UniversityNetworkGlobe } from "@/components/public/university-network-globe";
import { Button } from "@/components/ui/button";
import {
  audienceBenefits,
  keyBenefits,
  testimonials,
} from "@/features/public-site/content";

export default function LandingPage() {
  return (
    <>
      <ImmersiveStoryHero />

      <Section>
        <SectionInner className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <ScrollReveal>
            <SectionHeading
              eyebrow="Platform overview"
              title="A connected operating layer for the university ecosystem."
              description="CampusHub creates one trusted environment where institutions can coordinate engagement, student services, alumni relationships, employer partnerships, and future digital services."
            />
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <div className="premium-card relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
              <Image
                alt="CampusHub platform overview visual"
                className="h-full w-full object-cover image-zoom"
                fill
                src="/images/photography/students-collaborating.webp"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              align="center"
              eyebrow="Key benefits"
              title="Designed for trust, growth, and long-term institutional value."
              description="The public launch positions CampusHub as a serious ecosystem platform, not a single-purpose campus tool."
            />
          </ScrollReveal>
          <ScrollReveal
            stagger
            className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {keyBenefits.map((benefit) => (
              <MarketingCard key={benefit.title} {...benefit} />
            ))}
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Campus life"
              title="Real campus moments are the center of the platform story."
              description="CampusHub is designed around the daily reality of university communities: collaboration, events, study spaces, career development, networking, and student representation."
            />
          </ScrollReveal>
          <ScrollReveal stagger className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Students attending events",
                image: "/images/photography/campus-event.webp",
                description:
                  "Public events, academic showcases, leadership forums, and employability programs become easier to discover.",
              },
              {
                title: "Libraries and study spaces",
                image: "/images/photography/library-study.webp",
                description:
                  "CampusHub should feel grounded in the places where students study, collaborate, and access services.",
              },
              {
                title: "Lecture halls and learning",
                image: "/images/photography/lecture-hall.webp",
                description:
                  "Academic context stays visible as the ecosystem expands into opportunities, alumni, and marketplace services.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="premium-card overflow-hidden rounded-lg border border-border bg-background shadow-sm"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    alt=""
                    className="h-full w-full object-cover image-zoom"
                    fill
                    src={item.image}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <UniversityNetworkGlobe />
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Careers, networking, and community"
              title="A university ecosystem should show real people building real futures."
              description="Photography gives CampusHub a stronger institutional feel and helps the public site communicate trust beyond a generic software interface."
            />
          </ScrollReveal>
          <ScrollReveal stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Career development",
                image: "/images/photography/career-development.webp",
              },
              {
                title: "Professional networking",
                image: "/images/photography/professional-workplace.webp",
              },
              {
                title: "Community engagement",
                image: "/images/photography/community-engagement.webp",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="premium-card relative min-h-72 overflow-hidden rounded-lg border border-border"
              >
                <Image
                  alt=""
                  className="h-full w-full object-cover image-zoom"
                  fill
                  src={item.image}
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                </div>
              </div>
            ))}
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Audience benefits"
              title="Built for the people who make universities work."
              description="Each stakeholder group gets a clear role in the wider CampusHub ecosystem."
            />
          </ScrollReveal>
          <ScrollReveal stagger className="mt-10 grid gap-6 md:grid-cols-2">
            {audienceBenefits.map((audience) => (
              <article
                key={audience.title}
                className="premium-card overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
              >
                <div className="relative aspect-[16/8]">
                  <Image
                    alt=""
                    className="h-full w-full object-cover image-zoom"
                    fill
                    src={audience.image}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <audience.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold">{audience.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {audience.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {audience.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <Button
                    asChild
                    className="mt-6"
                    data-magnetic
                    variant="secondary"
                  >
                    <Link href={audience.href}>View details</Link>
                  </Button>
                </div>
              </article>
            ))}
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              align="center"
              eyebrow="Scale signals"
              title="Ready for multi-university expansion."
              description="The foundation is shaped for institutional scale, large user populations, and future ecosystem modules."
            />
          </ScrollReveal>
          <ScrollReveal className="mt-10">
            <StatGrid />
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <ScrollReveal>
            <SectionHeading
              align="center"
              eyebrow="Testimonials"
              title="A platform vision built for serious campus transformation."
            />
          </ScrollReveal>
          <ScrollReveal stagger className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item) => (
              <figure
                key={item.name}
                className="premium-card rounded-lg border border-border bg-surface p-6 shadow-sm"
              >
                <blockquote className="text-base leading-7 text-foreground">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-6">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </figcaption>
              </figure>
            ))}
          </ScrollReveal>
        </SectionInner>
      </Section>

      <Section surface="surface">
        <SectionInner className="text-center">
          <SectionHeading
            align="center"
            eyebrow="Call to action"
            title="Bring your university ecosystem into one trusted digital home."
            description="CampusHub is preparing institutions and partners for a connected future across student life, employability, alumni, and digital services."
          />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/join">Join CampusHub</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
