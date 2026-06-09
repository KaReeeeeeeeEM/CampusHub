"use client";

import {
  BriefcaseBusiness,
  Check,
  GraduationCap,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  CampusFormField,
  CampusInput,
  CampusSelect,
  CampusTextarea,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import {
  collegeOptions,
  committeeCategoryOptions,
  departmentOptions,
  industryOptions,
  universityOptions,
  yearOfStudyOptions,
} from "@/features/onboarding/lib/options";
import {
  ONBOARDING_ROLES,
  type OnboardingData,
  type OnboardingRole,
  roleLabels,
} from "@/features/onboarding/lib/types";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboarding-store";

const steps = [
  { key: "role", label: "Role" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "complete", label: "Complete" },
] as const;

const roleDescriptions: Record<OnboardingRole, string> = {
  STUDENT: "Set up your university, college, department, and year of study.",
  TEACHER: "Add your department and the courses you currently teach.",
  REPRESENTATIVE: "Connect your college and representative committee category.",
  CAMPUS_ADMIN: "Prepare your administrative profile for campus operations.",
  ALUMNI: "Share graduation and career information for alumni networking.",
  EMPLOYER: "Create your employer context for future talent workflows.",
};

const roleIcons: Record<
  OnboardingRole,
  React.ComponentType<{ className?: string }>
> = {
  STUDENT: GraduationCap,
  TEACHER: UserRoundCheck,
  REPRESENTATIVE: UsersRound,
  CAMPUS_ADMIN: ShieldCheck,
  ALUMNI: GraduationCap,
  EMPLOYER: BriefcaseBusiness,
};

type FieldErrors = Record<string, string>;

function formatSavedAt(savedAt: string | null) {
  if (!savedAt) {
    return "Not saved yet";
  }

  return `Saved ${new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(savedAt))}`;
}

function getRoleDataEntries(role: OnboardingRole, data: OnboardingData) {
  return Object.entries(data[role]).map(([key, value]) => ({
    key,
    label: key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase()),
    value: value || "Not provided",
  }));
}

function validateRoleData(
  role: OnboardingRole,
  data: OnboardingData,
): FieldErrors {
  const errors: FieldErrors = {};

  if (role === "STUDENT") {
    const value = data.STUDENT;
    if (!value.university) errors.university = "Select a university.";
    if (!value.college) errors.college = "Select a college.";
    if (!value.department) errors.department = "Select a department.";
    if (!value.yearOfStudy) errors.yearOfStudy = "Select your year of study.";
  }

  if (role === "TEACHER") {
    const value = data.TEACHER;
    if (!value.department) errors.department = "Select a department.";
    if (!value.courses.trim()) errors.courses = "Enter at least one course.";
  }

  if (role === "REPRESENTATIVE") {
    const value = data.REPRESENTATIVE;
    if (!value.college) errors.college = "Select a college.";
    if (!value.committeeCategory) {
      errors.committeeCategory = "Select a committee category.";
    }
  }

  if (role === "CAMPUS_ADMIN") {
    const value = data.CAMPUS_ADMIN;
    if (!value.university) errors.university = "Select a university.";
    if (!value.administrativeUnit.trim()) {
      errors.administrativeUnit = "Enter your administrative unit.";
    }
    if (!value.position.trim()) errors.position = "Enter your position.";
  }

  if (role === "ALUMNI") {
    const value = data.ALUMNI;
    if (!value.graduationYear.trim()) {
      errors.graduationYear = "Enter your graduation year.";
    }
    if (!value.careerTitle.trim())
      errors.careerTitle = "Enter your career title.";
    if (!value.organization.trim())
      errors.organization = "Enter your organization.";
    if (!value.industry) errors.industry = "Select your industry.";
  }

  if (role === "EMPLOYER") {
    const value = data.EMPLOYER;
    if (!value.companyName.trim()) errors.companyName = "Enter company name.";
    if (!value.industry) errors.industry = "Select company industry.";
    if (!value.hiringInterest.trim()) {
      errors.hiringInterest = "Describe your hiring interest.";
    }
  }

  return errors;
}

function SelectField({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <CampusFormField label={label} error={error}>
      <CampusSelect
        invalid={Boolean(error)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </CampusSelect>
    </CampusFormField>
  );
}

function TextField({
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <CampusFormField label={label} error={error}>
      <CampusInput
        invalid={Boolean(error)}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </CampusFormField>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <CampusFormField label={label} error={error}>
      <CampusTextarea
        invalid={Boolean(error)}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </CampusFormField>
  );
}

function RoleDetailsForm({
  role,
  errors,
}: {
  role: OnboardingRole;
  errors: FieldErrors;
}) {
  const data = useOnboardingStore((state) => state.data);
  const updateRoleData = useOnboardingStore((state) => state.updateRoleData);

  if (role === "STUDENT") {
    const value = data.STUDENT;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="University"
          value={value.university}
          options={universityOptions}
          error={errors.university}
          onChange={(university) => updateRoleData(role, { university })}
        />
        <SelectField
          label="College"
          value={value.college}
          options={collegeOptions}
          error={errors.college}
          onChange={(college) => updateRoleData(role, { college })}
        />
        <SelectField
          label="Department"
          value={value.department}
          options={departmentOptions}
          error={errors.department}
          onChange={(department) => updateRoleData(role, { department })}
        />
        <SelectField
          label="Year of study"
          value={value.yearOfStudy}
          options={yearOfStudyOptions}
          error={errors.yearOfStudy}
          onChange={(yearOfStudy) => updateRoleData(role, { yearOfStudy })}
        />
      </div>
    );
  }

  if (role === "TEACHER") {
    const value = data.TEACHER;
    return (
      <div className="grid gap-4">
        <SelectField
          label="Department"
          value={value.department}
          options={departmentOptions}
          error={errors.department}
          onChange={(department) => updateRoleData(role, { department })}
        />
        <TextAreaField
          label="Courses"
          value={value.courses}
          placeholder="Example: Data Structures, Software Engineering, Research Methods"
          error={errors.courses}
          onChange={(courses) => updateRoleData(role, { courses })}
        />
      </div>
    );
  }

  if (role === "REPRESENTATIVE") {
    const value = data.REPRESENTATIVE;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="College"
          value={value.college}
          options={collegeOptions}
          error={errors.college}
          onChange={(college) => updateRoleData(role, { college })}
        />
        <SelectField
          label="Committee category"
          value={value.committeeCategory}
          options={committeeCategoryOptions}
          error={errors.committeeCategory}
          onChange={(committeeCategory) =>
            updateRoleData(role, { committeeCategory })
          }
        />
      </div>
    );
  }

  if (role === "CAMPUS_ADMIN") {
    const value = data.CAMPUS_ADMIN;
    return (
      <div className="grid gap-4">
        <SelectField
          label="University"
          value={value.university}
          options={universityOptions}
          error={errors.university}
          onChange={(university) => updateRoleData(role, { university })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Administrative unit"
            value={value.administrativeUnit}
            placeholder="Student Affairs, Registry, ICT Directorate"
            error={errors.administrativeUnit}
            onChange={(administrativeUnit) =>
              updateRoleData(role, { administrativeUnit })
            }
          />
          <TextField
            label="Position"
            value={value.position}
            placeholder="Dean of Students, Registrar, ICT Manager"
            error={errors.position}
            onChange={(position) => updateRoleData(role, { position })}
          />
        </div>
      </div>
    );
  }

  if (role === "ALUMNI") {
    const value = data.ALUMNI;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Graduation year"
          value={value.graduationYear}
          placeholder="2022"
          error={errors.graduationYear}
          onChange={(graduationYear) =>
            updateRoleData(role, { graduationYear })
          }
        />
        <TextField
          label="Career title"
          value={value.careerTitle}
          placeholder="Product Manager"
          error={errors.careerTitle}
          onChange={(careerTitle) => updateRoleData(role, { careerTitle })}
        />
        <TextField
          label="Organization"
          value={value.organization}
          placeholder="Company or institution"
          error={errors.organization}
          onChange={(organization) => updateRoleData(role, { organization })}
        />
        <SelectField
          label="Industry"
          value={value.industry}
          options={industryOptions}
          error={errors.industry}
          onChange={(industry) => updateRoleData(role, { industry })}
        />
      </div>
    );
  }

  const value = data.EMPLOYER;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company name"
          value={value.companyName}
          placeholder="Company name"
          error={errors.companyName}
          onChange={(companyName) => updateRoleData(role, { companyName })}
        />
        <TextField
          label="Company website"
          value={value.companyWebsite}
          placeholder="https://company.com"
          error={errors.companyWebsite}
          onChange={(companyWebsite) =>
            updateRoleData(role, { companyWebsite })
          }
        />
      </div>
      <SelectField
        label="Industry"
        value={value.industry}
        options={industryOptions}
        error={errors.industry}
        onChange={(industry) => updateRoleData(role, { industry })}
      />
      <TextAreaField
        label="Hiring interest"
        value={value.hiringInterest}
        placeholder="Describe internships, graduate hiring, partnerships, or campus engagement goals."
        error={errors.hiringInterest}
        onChange={(hiringInterest) => updateRoleData(role, { hiringInterest })}
      />
    </div>
  );
}

export function OnboardingFlow() {
  const role = useOnboardingStore((state) => state.role);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const data = useOnboardingStore((state) => state.data);
  const savedAt = useOnboardingStore((state) => state.savedAt);
  const setRole = useOnboardingStore((state) => state.setRole);
  const setStep = useOnboardingStore((state) => state.setStep);
  const saveProgress = useOnboardingStore((state) => state.saveProgress);
  const complete = useOnboardingStore((state) => state.complete);
  const reset = useOnboardingStore((state) => state.reset);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const activeStepIndex = steps.findIndex((step) => step.key === currentStep);
  const reviewEntries = useMemo(
    () => (role ? getRoleDataEntries(role, data) : []),
    [data, role],
  );

  async function handleSaveProgress() {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    saveProgress();
    setIsSaving(false);
  }

  function handleContinueFromDetails() {
    if (!role) {
      setStep("role");
      return;
    }

    const validationErrors = validateRoleData(role, data);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setStep("review");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            CampusHub onboarding
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Complete your role-based setup.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your progress is saved locally on this device. Future releases can
            sync this data to the CampusHub onboarding API.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>{formatSavedAt(savedAt)}</span>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveProgress}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save progress
          </Button>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={cn(
              "rounded-lg border p-4",
              index <= activeStepIndex
                ? "border-primary bg-primary/10"
                : "border-border bg-surface",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold",
                  index <= activeStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground",
                )}
              >
                {index < activeStepIndex || currentStep === "complete" ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        {currentStep === "role" ? (
          <div>
            <h2 className="text-xl font-semibold">
              Choose your CampusHub role.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This determines the onboarding questions shown next.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ONBOARDING_ROLES.map((item) => {
                const Icon = roleIcons[item];

                return (
                  <Button
                    key={item}
                    className="h-auto flex-col items-start rounded-lg border border-border bg-background p-5 text-left text-foreground hover:border-primary hover:bg-background"
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setRole(item);
                    }}
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold">{roleLabels[item]}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {roleDescriptions[item]}
                    </p>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}

        {currentStep === "details" && role ? (
          <div>
            <h2 className="text-xl font-semibold">
              {roleLabels[role]} onboarding details
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fill in the required fields for your selected role.
            </p>
            <div className="mt-6">
              <RoleDetailsForm role={role} errors={errors} />
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("role")}
              >
                Back
              </Button>
              <Button type="button" onClick={handleContinueFromDetails}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {currentStep === "review" && role ? (
          <div>
            <h2 className="text-xl font-semibold">
              Review your onboarding profile.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirm the saved information before completing onboarding.
            </p>
            <div className="mt-6 rounded-lg border border-border bg-background">
              <div className="border-b border-border p-4">
                <p className="text-sm text-muted-foreground">Selected role</p>
                <p className="mt-1 font-semibold">{roleLabels[role]}</p>
              </div>
              <dl className="grid gap-0 sm:grid-cols-2">
                {reviewEntries.map((entry) => (
                  <div key={entry.key} className="border-b border-border p-4">
                    <dt className="text-sm text-muted-foreground">
                      {entry.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("details")}
              >
                Back
              </Button>
              <Button type="button" onClick={complete}>
                Complete onboarding
              </Button>
            </div>
          </div>
        ) : null}

        {currentStep === "complete" ? (
          <div className="mx-auto max-w-2xl py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold">
              Onboarding complete.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your CampusHub onboarding profile has been saved. The next product
              milestone can connect this persisted profile to tenant setup,
              approval workflows, and role-specific dashboards.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("review")}
              >
                Review profile
              </Button>
              <Button type="button" variant="secondary" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Start over
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
