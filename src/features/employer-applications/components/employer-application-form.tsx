"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  CampusCombobox,
  CampusInput,
  CampusTextarea,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { countryOptions } from "@/constants/countries";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  companySizeOptions,
  employerApplicationSchema,
  type EmployerApplicationInput,
} from "@/features/employer-applications/lib/schemas";

export function EmployerApplicationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployerApplicationInput>({
    resolver: zodResolver(employerApplicationSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "1-10",
      website: "",
      contactPerson: "",
      position: "",
      email: "",
      phone: "",
      country: "",
      reasonForJoining: "",
    },
  });

  async function onSubmit(values: EmployerApplicationInput) {
    setError(null);

    const response = await fetch("/api/employer-applications", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Unable to submit employer application.");
      return;
    }

    router.push("/employers/application-submitted");
  }

  return (
    <form
      className="rounded-lg border border-border bg-surface p-6 shadow-sm"
      onSubmit={handleSubmit(onSubmit)}
    >
      {error ? <AuthAlert type="error" message={error} /> : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <AuthField label="Company name" error={errors.companyName?.message}>
          <CampusInput
            {...register("companyName")}
            invalid={Boolean(errors.companyName)}
            placeholder="Company or organization"
          />
        </AuthField>
        <AuthField label="Industry" error={errors.industry?.message}>
          <CampusInput
            {...register("industry")}
            invalid={Boolean(errors.industry)}
            placeholder="Technology, finance, healthcare"
          />
        </AuthField>
        <AuthField label="Company size" error={errors.companySize?.message}>
          <Controller
            control={control}
            name="companySize"
            render={({ field }) => (
              <CampusCombobox
                invalid={Boolean(errors.companySize)}
                options={companySizeOptions.map((size) => ({
                  label: size,
                  value: size,
                }))}
                placeholder="Select company size"
                searchPlaceholder="Search sizes"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </AuthField>
        <AuthField label="Website" error={errors.website?.message}>
          <CampusInput
            {...register("website")}
            invalid={Boolean(errors.website)}
            placeholder="https://example.com"
            type="url"
          />
        </AuthField>
        <AuthField label="Contact person" error={errors.contactPerson?.message}>
          <CampusInput
            {...register("contactPerson")}
            autoComplete="name"
            invalid={Boolean(errors.contactPerson)}
            placeholder="Full name"
          />
        </AuthField>
        <AuthField label="Position" error={errors.position?.message}>
          <CampusInput
            {...register("position")}
            invalid={Boolean(errors.position)}
            placeholder="Talent Lead, HR Manager"
          />
        </AuthField>
        <AuthField label="Email" error={errors.email?.message}>
          <CampusInput
            {...register("email")}
            autoComplete="email"
            invalid={Boolean(errors.email)}
            placeholder="you@company.com"
            type="email"
          />
        </AuthField>
        <AuthField label="Phone" error={errors.phone?.message}>
          <CampusInput
            {...register("phone")}
            autoComplete="tel"
            invalid={Boolean(errors.phone)}
            placeholder="+255..."
          />
        </AuthField>
        <AuthField label="Country" error={errors.country?.message}>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <CampusCombobox
                invalid={Boolean(errors.country)}
                options={countryOptions}
                placeholder="Select country"
                searchPlaceholder="Search countries"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </AuthField>
        <AuthField
          label="Reason for joining"
          error={errors.reasonForJoining?.message}
        >
          <CampusTextarea
            {...register("reasonForJoining")}
            className="min-h-36"
            invalid={Boolean(errors.reasonForJoining)}
            placeholder="Tell us how your organization wants to engage with universities, students, or graduates."
          />
        </AuthField>
      </div>

      <Button className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Submit employer application
      </Button>
    </form>
  );
}
