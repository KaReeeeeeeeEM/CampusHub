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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CampusFormField,
  CampusInput,
  CampusSelect,
} from "@/components/campushub";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { PageLoadingState } from "@/components/shared/page-loading-state";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import {
  collegeOptions,
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
import { KiboAvatar } from "@/lib/kibo";
import { useOnboardingStore } from "@/store/onboarding-store";

const steps = [
  { key: "role", label: "Role" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "complete", label: "Complete" },
] as const;

const roleDescriptions: Record<OnboardingRole, string> = {
  STUDENT: "Set up your university, college, department, and year of study.",
  TEACHER: "Add your university and department context.",
  CAMPUS_ADMIN: "Prepare your administrative profile for campus operations.",
  ALUMNI: "Share graduation and current employment information.",
  EMPLOYER: "Create your employer context for future talent workflows.",
};

const companySizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const roleIcons: Record<
  OnboardingRole,
  React.ComponentType<{ className?: string }>
> = {
  STUDENT: GraduationCap,
  TEACHER: UserRoundCheck,
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
    if (!value.year) errors.year = "Select your year.";
  }

  if (role === "TEACHER") {
    const value = data.TEACHER;
    if (!value.university) errors.university = "Select a university.";
    if (!value.department) errors.department = "Select a department.";
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
    if (!value.currentEmployer.trim()) {
      errors.currentEmployer = "Enter your current employer.";
    }
    if (!value.position.trim()) errors.position = "Enter your position.";
  }

  if (role === "EMPLOYER") {
    const value = data.EMPLOYER;
    if (!value.company.trim()) errors.company = "Enter company name.";
    if (!value.industry) errors.industry = "Select company industry.";
    if (!value.companySize) errors.companySize = "Select company size.";
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
          label="Year"
          value={value.year}
          options={yearOfStudyOptions}
          error={errors.year}
          onChange={(year) => updateRoleData(role, { year })}
        />
      </div>
    );
  }

  if (role === "TEACHER") {
    const value = data.TEACHER;
    return (
      <div className="grid gap-4">
        <SelectField
          label="University"
          value={value.university}
          options={universityOptions}
          error={errors.university}
          onChange={(university) => updateRoleData(role, { university })}
        />
        <SelectField
          label="Department"
          value={value.department}
          options={departmentOptions}
          error={errors.department}
          onChange={(department) => updateRoleData(role, { department })}
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
          label="Current employer"
          value={value.currentEmployer}
          placeholder="Company or institution"
          error={errors.currentEmployer}
          onChange={(currentEmployer) =>
            updateRoleData(role, { currentEmployer })
          }
        />
        <TextField
          label="Position"
          value={value.position}
          placeholder="Product Manager"
          error={errors.position}
          onChange={(position) => updateRoleData(role, { position })}
        />
      </div>
    );
  }

  const value = data.EMPLOYER;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company"
          value={value.company}
          placeholder="Company name"
          error={errors.company}
          onChange={(company) => updateRoleData(role, { company })}
        />
        <SelectField
          label="Company size"
          value={value.companySize}
          options={companySizeOptions}
          error={errors.companySize}
          onChange={(companySize) => updateRoleData(role, { companySize })}
        />
      </div>
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

export function OnboardingFlow() {
  const router = useRouter();
  const role = useOnboardingStore((state) => state.role);
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const data = useOnboardingStore((state) => state.data);
  const savedAt = useOnboardingStore((state) => state.savedAt);
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const setRole = useOnboardingStore((state) => state.setRole);
  const setStep = useOnboardingStore((state) => state.setStep);
  const saveProgress = useOnboardingStore((state) => state.saveProgress);
  const complete = useOnboardingStore((state) => state.complete);
  const reset = useOnboardingStore((state) => state.reset);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const activeStepIndex = steps.findIndex((step) => step.key === currentStep);
  const reviewEntries = useMemo(
    () => (role ? getRoleDataEntries(role, data) : []),
    [data, role],
  );

  useEffect(() => {
    let mounted = true;

    async function loadOnboardingProgress() {
      setIsLoading(true);
      setLoadError(null);

      const response = await fetch("/api/onboarding", {
        cache: "no-store",
      });

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        setLoadError("Unable to load saved onboarding progress.");
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as {
        onboarding: Parameters<typeof hydrate>[0];
      };

      hydrate(payload.onboarding);
      setIsLoading(false);
    }

    void loadOnboardingProgress();

    return () => {
      mounted = false;
    };
  }, [hydrate]);

  async function persistProgress(nextStep = currentStep) {
    const response = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        role,
        currentStep: nextStep,
        data,
        completed: false,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Unable to save onboarding progress.");
    }

    const payload = (await response.json()) as {
      onboarding: Parameters<typeof hydrate>[0];
    };

    hydrate(payload.onboarding);
  }

  async function handleSaveProgress() {
    setIsSaving(true);
    setStatusMessage(null);
    setLoadError(null);

    try {
      await persistProgress();
      saveProgress();
      setStatusMessage("Progress saved.");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to save onboarding progress.",
      );
    } finally {
      setIsSaving(false);
    }
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
      void persistProgress("review").catch((error) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to save onboarding progress.",
        );
      });
    }
  }

  async function handleCompleteOnboarding() {
    if (!role) {
      return;
    }

    setIsCompleting(true);
    setLoadError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          role,
          currentStep: "complete",
          data,
          completed: true,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Unable to complete onboarding.");
      }

      const payload = (await response.json()) as {
        onboarding: Parameters<typeof hydrate>[0];
      };

      hydrate(payload.onboarding);
      complete();
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to complete onboarding.",
      );
    } finally {
      setIsCompleting(false);
    }
  }

  if (isLoading) {
    return (
      <PageLoadingState
        title="Loading onboarding"
        description="Fetching your role, university, college, and department setup."
      />
    );
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
            Your progress is saved securely and can be resumed when you return.
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

      {loadError ? (
        <div className="mb-6">
          <AuthAlert type="error" message={loadError} />
        </div>
      ) : null}
      {statusMessage ? (
        <div className="mb-6">
          <AuthAlert type="success" message={statusMessage} />
        </div>
      ) : null}

      <MultiStepProgress
        activeIndex={activeStepIndex}
        className="mb-8"
        steps={steps.map((step) => ({
          label: step.label,
          icon: Check,
        }))}
      />

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        {currentStep === "role" ? (
          <div>
            <h2 className="text-xl font-semibold">
              Choose your CampusHub role.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This determines the onboarding questions shown next.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-border bg-background p-5 text-center sm:flex-row sm:text-left">
              <KiboAvatar mood="happy" size="lg" className="shrink-0" />
              <div>
                <h3 className="text-base font-semibold">Meet Kibo</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Kibo is the CampusHub companion for onboarding, empty states,
                  streaks, badge unlocks, reminders, and important celebration
                  moments. Kibo is not a chatbot and will only appear when it
                  helps.
                </p>
              </div>
            </div>
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
              <Button
                type="button"
                disabled={isCompleting}
                onClick={handleCompleteOnboarding}
              >
                {isCompleting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
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
              <Button
                type="button"
                onClick={() => router.push("/dashboard")}
              >
                Enter CampusHub
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
