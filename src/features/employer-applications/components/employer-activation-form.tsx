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
import { PasswordChecklist } from "@/features/auth/lib/password";
import {
  employerActivationSchema,
  type EmployerActivationInput,
} from "@/features/employer-applications/lib/schemas";

type EmployerActivationFormProps = {
  token: string;
};

export function EmployerActivationForm({ token }: EmployerActivationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployerActivationInput>({
    resolver: zodResolver(employerActivationSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  async function onSubmit(values: EmployerActivationInput) {
    setError(null);

    const response = await fetch("/api/employer-applications/activate", {
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
      setError(payload.error || "Unable to activate employer account.");
      return;
    }

    router.push("/verification-success");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
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
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Activate employer account
      </Button>
    </form>
  );
}
