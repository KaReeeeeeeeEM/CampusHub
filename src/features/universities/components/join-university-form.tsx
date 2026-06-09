"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  CampusInput,
  CampusSelect,
  CampusTextarea,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, TENANT_ROLES } from "@/features/authorization/roles";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  joinUniversitySchema,
  type JoinUniversityInput,
} from "@/features/universities/lib/schemas";
import type { University } from "@/features/universities/lib/mock-data";

export function JoinUniversityForm({
  universities,
}: {
  universities: University[];
}) {
  const searchParams = useSearchParams();
  const selectedUniversity = searchParams.get("university") || "";
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JoinUniversityInput>({
    resolver: zodResolver(joinUniversitySchema),
    defaultValues: {
      universitySlug: selectedUniversity,
      fullName: "",
      email: "",
      role: "STUDENT",
      studentOrStaffId: "",
      message: "",
    },
  });

  async function onSubmit(values: JoinUniversityInput) {
    setSuccess(null);
    setError(null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const university = universities.find(
      (item) => item.slug === values.universitySlug,
    );

    if (!university) {
      setError("Select a valid university before submitting.");
      return;
    }

    setSuccess(
      `Join request submitted for ${university.shortName}. CampusHub will verify your university relationship.`,
    );
    reset({
      universitySlug: values.universitySlug,
      fullName: "",
      email: "",
      role: values.role,
      studentOrStaffId: "",
      message: "",
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {success ? <AuthAlert type="success" message={success} /> : null}
      {error ? <AuthAlert type="error" message={error} /> : null}

      <AuthField label="University" error={errors.universitySlug?.message}>
        <CampusSelect
          {...register("universitySlug")}
          invalid={Boolean(errors.universitySlug)}
        >
          <option value="">Select university</option>
          {universities.map((university) => (
            <option key={university.slug} value={university.slug}>
              {university.name}
            </option>
          ))}
        </CampusSelect>
      </AuthField>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Full name" error={errors.fullName?.message}>
          <CampusInput
            {...register("fullName")}
            invalid={Boolean(errors.fullName)}
            placeholder="Your full name"
          />
        </AuthField>
        <AuthField label="Email address" error={errors.email?.message}>
          <CampusInput
            {...register("email")}
            invalid={Boolean(errors.email)}
            placeholder="you@university.edu"
            type="email"
          />
        </AuthField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Role" error={errors.role?.message}>
          <CampusSelect {...register("role")} invalid={Boolean(errors.role)}>
            {TENANT_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </CampusSelect>
        </AuthField>
        <AuthField
          label="Student or staff ID"
          error={errors.studentOrStaffId?.message}
        >
          <CampusInput
            {...register("studentOrStaffId")}
            invalid={Boolean(errors.studentOrStaffId)}
            placeholder="Optional"
          />
        </AuthField>
      </div>

      <AuthField label="Message" error={errors.message?.message}>
        <CampusTextarea
          {...register("message")}
          invalid={Boolean(errors.message)}
          placeholder="Optional context for verification"
        />
      </AuthField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Submit join request
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Can’t find your institution?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/request-university"
        >
          Request a university
        </Link>
      </p>
    </form>
  );
}
