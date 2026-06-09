"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  CampusInput,
  CampusSelect,
  CampusTextarea,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  requestUniversitySchema,
  type RequestUniversityInput,
} from "@/features/universities/lib/schemas";

export function RequestUniversityForm() {
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestUniversityInput>({
    resolver: zodResolver(requestUniversitySchema),
    defaultValues: {
      universityName: "",
      country: "",
      city: "",
      website: "",
      requesterName: "",
      requesterEmail: "",
      relationship: "Student",
      notes: "",
    },
  });

  async function onSubmit(values: RequestUniversityInput) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSuccess(
      `${values.universityName} has been submitted for CampusHub review.`,
    );
    reset();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {success ? <AuthAlert type="success" message={success} /> : null}

      <AuthField label="University name" error={errors.universityName?.message}>
        <CampusInput
          {...register("universityName")}
          invalid={Boolean(errors.universityName)}
          placeholder="Example University"
        />
      </AuthField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Country" error={errors.country?.message}>
          <CampusInput
            {...register("country")}
            invalid={Boolean(errors.country)}
            placeholder="Tanzania"
          />
        </AuthField>
        <AuthField label="City" error={errors.city?.message}>
          <CampusInput
            {...register("city")}
            invalid={Boolean(errors.city)}
            placeholder="Dar es Salaam"
          />
        </AuthField>
      </div>

      <AuthField label="University website" error={errors.website?.message}>
        <CampusInput
          {...register("website")}
          invalid={Boolean(errors.website)}
          placeholder="https://example.ac.tz"
          type="url"
        />
      </AuthField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Your name" error={errors.requesterName?.message}>
          <CampusInput
            {...register("requesterName")}
            invalid={Boolean(errors.requesterName)}
            placeholder="Your full name"
          />
        </AuthField>
        <AuthField label="Your email" error={errors.requesterEmail?.message}>
          <CampusInput
            {...register("requesterEmail")}
            invalid={Boolean(errors.requesterEmail)}
            placeholder="you@example.com"
            type="email"
          />
        </AuthField>
      </div>

      <AuthField label="Relationship" error={errors.relationship?.message}>
        <CampusSelect
          {...register("relationship")}
          invalid={Boolean(errors.relationship)}
        >
          <option>Student</option>
          <option>Teacher</option>
          <option>Campus administrator</option>
          <option>Alumni</option>
          <option>Employer</option>
          <option>Other</option>
        </CampusSelect>
      </AuthField>

      <AuthField label="Notes" error={errors.notes?.message}>
        <CampusTextarea
          {...register("notes")}
          invalid={Boolean(errors.notes)}
          placeholder="Tell us why this university should be added."
        />
      </AuthField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Request university
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Want to browse listed universities?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/universities"
        >
          View discovery
        </Link>
      </p>
    </form>
  );
}
