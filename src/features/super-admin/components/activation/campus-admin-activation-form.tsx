"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiLoader } from "react-icons/fi";
import type { z } from "zod";

import { CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { PasswordChecklist } from "@/features/auth/lib/password";
import {
  campusAdminActivationSchema,
  type CampusAdminActivationInput,
} from "@/features/super-admin/lib/schemas";

type CampusAdminActivationFormProps = {
  token: string;
};

export function CampusAdminActivationForm({
  token,
}: CampusAdminActivationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof campusAdminActivationSchema>,
    unknown,
    CampusAdminActivationInput
  >({
    resolver: zodResolver(campusAdminActivationSchema),
    defaultValues: {
      token,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  async function onSubmit(values: CampusAdminActivationInput) {
    setError(null);

    const response = await fetch("/api/campus-admin-invitations/activate", {
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
      setError(payload.error || "Unable to activate Campus Admin account.");
      return;
    }

    router.push("/verification-success");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
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
      <AuthField label="Email" error={errors.email?.message}>
        <CampusInput
          {...register("email")}
          autoComplete="email"
          invalid={Boolean(errors.email)}
          placeholder="you@university.edu"
          type="email"
        />
      </AuthField>
      <AuthField label="Phone" error={errors.phone?.message}>
        <CampusInput
          {...register("phone")}
          autoComplete="tel"
          invalid={Boolean(errors.phone)}
          placeholder="+255 000 000 000"
        />
      </AuthField>
      <AuthField label="Password" error={errors.password?.message}>
        <CampusInput
          {...register("password")}
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          placeholder="Create your password"
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
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Activate Campus Admin account
      </Button>
    </form>
  );
}
