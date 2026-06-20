"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  superAdminBootstrapSchema,
  type SuperAdminBootstrapInput,
} from "@/features/bootstrap/lib/schemas";

export function SuperAdminBootstrapForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuperAdminBootstrapInput>({
    resolver: zodResolver(superAdminBootstrapSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SuperAdminBootstrapInput) {
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/bootstrap/super-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    if (!response.ok) {
      setError(
        payload?.message ??
          "Unable to create the Super Admin account. Try again.",
      );
      return;
    }

    setSuccess("Super Admin created. Redirecting to login...");
    router.replace("/login");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <AuthAlert
        type="info"
        message="This one-time setup is available only while no Super Admin exists."
      />
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

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

      <AuthField label="Email address" error={errors.email?.message}>
        <CampusInput
          {...register("email")}
          autoComplete="email"
          invalid={Boolean(errors.email)}
          placeholder="admin@campushub.edu"
          type="email"
        />
      </AuthField>

      <AuthField label="Password" error={errors.password?.message}>
        <CampusInput
          {...register("password")}
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          placeholder="Create a secure password"
          type="password"
        />
      </AuthField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Create Super Admin
      </Button>
    </form>
  );
}
