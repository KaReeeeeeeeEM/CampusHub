"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput, CampusSelect } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { PasswordChecklist } from "@/features/auth/lib/password";
import {
  studentInvitationRegistrationSchema,
  type StudentInvitationRegistrationInput,
} from "@/features/enrollment/lib/schemas";

type InvitationContext = {
  token: string;
  universityName: string;
  collegeName: string;
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};

const yearOptions = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Postgraduate",
];

export function StudentInvitationRegistrationForm({
  invitation,
}: {
  invitation: InvitationContext;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentInvitationRegistrationInput>({
    resolver: zodResolver(studentInvitationRegistrationSchema),
    defaultValues: {
      token: invitation.token,
      firstName: "",
      lastName: "",
      otherNames: "",
      nickname: "",
      username: "",
      email: "",
      department: "",
      yearOfStudy: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  async function onSubmit(values: StudentInvitationRegistrationInput) {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/enrollment/join", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json()) as {
      error?: string;
      status?: string;
    };

    if (!response.ok) {
      if (payload.status === "expired") {
        router.push("/join/expired");
        return;
      }

      if (payload.status) {
        router.push("/join/invalid");
        return;
      }

      setError(payload.error || "Unable to complete enrollment.");
      return;
    }

    setSuccess("Account created. Redirecting...");
    router.push("/join/success");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="University">
          <CampusInput value={invitation.universityName} disabled readOnly />
        </AuthField>
        <AuthField label="College">
          <CampusInput value={invitation.collegeName} disabled readOnly />
        </AuthField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="First name" error={errors.firstName?.message}>
          <CampusInput
            {...register("firstName")}
            autoComplete="given-name"
            invalid={Boolean(errors.firstName)}
            placeholder="First name"
          />
        </AuthField>
        <AuthField label="Last name" error={errors.lastName?.message}>
          <CampusInput
            {...register("lastName")}
            autoComplete="family-name"
            invalid={Boolean(errors.lastName)}
            placeholder="Last name"
          />
        </AuthField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Other names" error={errors.otherNames?.message}>
          <CampusInput
            {...register("otherNames")}
            autoComplete="additional-name"
            invalid={Boolean(errors.otherNames)}
            placeholder="Optional"
          />
        </AuthField>
        <AuthField label="Nickname" error={errors.nickname?.message}>
          <CampusInput
            {...register("nickname")}
            invalid={Boolean(errors.nickname)}
            placeholder="Optional"
          />
        </AuthField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Username" error={errors.username?.message}>
          <CampusInput
            {...register("username")}
            autoComplete="username"
            invalid={Boolean(errors.username)}
            placeholder="e.g. amina_m"
          />
        </AuthField>
        <AuthField label="Email" error={errors.email?.message}>
          <CampusInput
            {...register("email")}
            autoComplete="email"
            invalid={Boolean(errors.email)}
            placeholder="you@university.edu"
            type="email"
          />
        </AuthField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Department" error={errors.department?.message}>
          <CampusSelect
            {...register("department")}
            disabled={invitation.departments.length === 0}
            invalid={Boolean(errors.department)}
          >
            <option value="">
              {invitation.departments.length > 0
                ? "Select department"
                : "No departments registered"}
            </option>
            {invitation.departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
                {department.code ? ` (${department.code})` : ""}
              </option>
            ))}
          </CampusSelect>
        </AuthField>
        <AuthField label="Year of study" error={errors.yearOfStudy?.message}>
          <CampusSelect
            {...register("yearOfStudy")}
            invalid={Boolean(errors.yearOfStudy)}
          >
            <option value="">Select year</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </CampusSelect>
        </AuthField>
      </div>

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

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Create student account
      </Button>
    </form>
  );
}
