import {
  CampusFormField,
  CampusInput,
  CampusSelect,
  CampusTextarea,
} from "@/components/campushub";
import { PageHero } from "@/components/public/page-hero";
import {
  Section,
  SectionHeading,
  SectionInner,
} from "@/components/public/section";
import { Button } from "@/components/ui/button";

const options = [
  "University leadership",
  "Campus administrator",
  "Student representative",
  "Employer",
  "University advancement team",
  "Business partner",
];

export default function JoinPage() {
  return (
    <>
      <PageHero
        eyebrow="Join CampusHub"
        image="/images/photography/landing-hero.webp"
        primaryLabel="Submit interest"
        secondaryHref="/features"
        secondaryLabel="Explore features"
        title="Register interest in the CampusHub ecosystem."
        description="Tell us who you are and how you want to participate. CampusHub will use this information to shape onboarding conversations and launch planning."
      />
      <Section>
        <SectionInner className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="Interest form"
            title="Help us understand your role in the ecosystem."
            description="Share your organization, role, and goals so the CampusHub team can understand the right onboarding path."
          />
          <form className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampusFormField label="Full name">
                <CampusInput />
              </CampusFormField>
              <CampusFormField label="Work email">
                <CampusInput type="email" />
              </CampusFormField>
              <CampusFormField label="Organization">
                <CampusInput />
              </CampusFormField>
              <CampusFormField label="Role">
                <CampusSelect>
                  {options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </CampusSelect>
              </CampusFormField>
              <CampusFormField
                label="What are you interested in?"
                className="flex flex-col gap-3 text-sm font-medium sm:col-span-2"
              >
                <CampusTextarea className="min-h-36" />
              </CampusFormField>
            </div>
            <Button className="mt-6" type="button">
              Submit interest
            </Button>
          </form>
        </SectionInner>
      </Section>
    </>
  );
}
