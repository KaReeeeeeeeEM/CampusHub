"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { PasswordChecklist } from "@/features/auth/lib/password";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/lib/schemas";
import { authClient } from "@/lib/auth/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(
    token
      ? null
      : "Reset token is missing or expired. Request a new reset link.",
  );
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (response.error) {
      setError(
        response.error.message ||
          "Unable to reset your password. Request a new reset link.",
      );
      return;
    }

    setSuccess("Password reset successfully. Redirecting to login...");
    setTimeout(() => router.push("/login"), 900);
  }

  const password = watch("password");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <AuthField label="New password" error={errors.password?.message}>
        <CampusInput
          {...register("password")}
          autoComplete="new-password"
          disabled={!token || isSubmitting}
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
          disabled={!token || isSubmitting}
          invalid={Boolean(errors.confirmPassword)}
          placeholder="Confirm your password"
          type="password"
        />
      </AuthField>

      <Button
        className="w-full"
        disabled={!token || isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Reset password
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Need a new link?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/forgot-password"
        >
          Request reset
        </Link>
      </p>
    </form>
  );
}
