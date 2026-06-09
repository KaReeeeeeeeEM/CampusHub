"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput, CampusSelect } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, TENANT_ROLES } from "@/features/authorization/roles";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { PasswordChecklist } from "@/features/auth/lib/password";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/lib/schemas";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const registerSteps = [
  {
    key: "account",
    label: "Account",
    description: "Start with your identity and university email.",
  },
  {
    key: "role",
    label: "Role",
    description: "Tell CampusHub which experience to prepare for you.",
  },
  {
    key: "security",
    label: "Security",
    description: "Create a password and finish account creation.",
  },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      intendedRole: "STUDENT",
    },
  });

  const password = watch("password");
  const currentStep = registerSteps[activeStep];
  const isLastStep = activeStep === registerSteps.length - 1;

  async function handleNextStep() {
    setError(null);

    const fieldsToValidate =
      activeStep === 0
        ? (["name", "email"] as const)
        : activeStep === 1
          ? (["intendedRole"] as const)
          : (["password", "confirmPassword"] as const);

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setActiveStep((step) => Math.min(step + 1, registerSteps.length - 1));
    }
  }

  async function onSubmit(values: RegisterInput) {
    setError(null);
    setSuccess(null);

    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/verification-success",
      intendedRole: values.intendedRole,
    } as unknown as Parameters<typeof authClient.signUp.email>[0];

    const response = await authClient.signUp.email(payload);

    if (response.error) {
      setError(
        response.error.message ||
          "Unable to create your account. Check the details and try again.",
      );
      return;
    }

    setSuccess(
      "Account created. Check your email for the verification link before logging in.",
    );
    router.push(
      `/verification-success?email=${encodeURIComponent(values.email)}`,
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={
        isLastStep
          ? handleSubmit(onSubmit)
          : (event) => {
              event.preventDefault();
              void handleNextStep();
            }
      }
    >
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <div className="space-y-4">
        <div className="grid grid-cols-3 items-start gap-3">
          {registerSteps.map((step, index) => (
            <div
              key={step.key}
              className="relative flex flex-col items-center gap-3 text-center"
            >
              {index < registerSteps.length - 1 ? (
                <span className="absolute left-1/2 top-3 h-0.5 w-full translate-x-4 bg-border">
                  <span
                    className={cn(
                      "block h-full bg-primary transition-all duration-300",
                      index < activeStep ? "w-full" : "w-0",
                    )}
                  />
                </span>
              ) : null}
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold transition-colors",
                  index <= activeStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {index < activeStep ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "max-w-32 text-xs font-semibold leading-5",
                  index === activeStep
                    ? "text-foreground"
                    : index < activeStep
                      ? "text-primary"
                      : "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {currentStep.description}
        </p>
      </div>

      {activeStep === 0 ? (
        <div className="space-y-5">
          <AuthField label="Full name" error={errors.name?.message}>
            <CampusInput
              {...register("name")}
              autoComplete="name"
              invalid={Boolean(errors.name)}
              placeholder="Your full name"
            />
          </AuthField>

          <AuthField label="Email address" error={errors.email?.message}>
            <CampusInput
              {...register("email")}
              autoComplete="email"
              invalid={Boolean(errors.email)}
              placeholder="you@university.edu"
              type="email"
            />
          </AuthField>
        </div>
      ) : null}

      {activeStep === 1 ? (
        <div className="space-y-5">
          <AuthField label="Future role" error={errors.intendedRole?.message}>
            <CampusSelect
              {...register("intendedRole")}
              invalid={Boolean(errors.intendedRole)}
            >
              {TENANT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </CampusSelect>
          </AuthField>
          <div className="rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            Role selection helps CampusHub prepare onboarding. Final access is
            still verified through institution records and administrator
            assignment.
          </div>
        </div>
      ) : null}

      {activeStep === 2 ? (
        <div className="space-y-5">
          <AuthField label="Password" error={errors.password?.message}>
            <CampusInput
              {...register("password")}
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              placeholder="Create a strong password"
              type="password"
            />
          </AuthField>
          <PasswordChecklist password={password} />

          <AuthField
            label="Confirm password"
            error={errors.confirmPassword?.message}
          >
            <CampusInput
              {...register("confirmPassword")}
              autoComplete="new-password"
              invalid={Boolean(errors.confirmPassword)}
              placeholder="Confirm your password"
              type="password"
            />
          </AuthField>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {activeStep > 0 ? (
          <Button
            className="w-full"
            disabled={isSubmitting}
            type="button"
            variant="secondary"
            onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
          >
            Back
          </Button>
        ) : null}
        <Button
          className="w-full"
          disabled={isSubmitting}
          type={isLastStep ? "submit" : "button"}
          onClick={isLastStep ? undefined : () => void handleNextStep()}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isLastStep ? "Create account" : "Continue"}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/login"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
