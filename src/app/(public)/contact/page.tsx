import { Mail, MapPin, Phone } from "lucide-react";

import {
  CampusFormField,
  CampusInput,
  CampusTextarea,
} from "@/components/campushub";
import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";

const contactItems = [
  { label: "Email", value: "hello@campushub.local", icon: Mail },
  { label: "Phone", value: "+255 000 000 000", icon: Phone },
  { label: "Region", value: "East Africa launch focus", icon: MapPin },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        image="/images/photography/community-engagement.webp"
        title="Talk to CampusHub about your institution or partnership."
        description="Reach out for university onboarding, employer partnerships, alumni programs, or ecosystem collaboration."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeading
              eyebrow="Get in touch"
              title="Start the conversation."
              description="Share your role, institution, and goals. The CampusHub team will use this context to qualify the right launch path."
            />
            <div className="mt-8 space-y-4">
              {contactItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <form className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampusFormField label="Name">
                <CampusInput />
              </CampusFormField>
              <CampusFormField label="Email">
                <CampusInput type="email" />
              </CampusFormField>
              <CampusFormField
                label="Organization"
                className="flex flex-col gap-3 text-sm font-medium sm:col-span-2"
              >
                <CampusInput />
              </CampusFormField>
              <CampusFormField
                label="Message"
                className="flex flex-col gap-3 text-sm font-medium sm:col-span-2"
              >
                <CampusTextarea className="min-h-36" />
              </CampusFormField>
            </div>
            <Button className="mt-6" type="button">
              Send message
            </Button>
          </form>
        </SectionInner>
      </Section>
    </>
  );
}
