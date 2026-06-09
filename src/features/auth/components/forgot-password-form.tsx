"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/lib/schemas";
import { authClient } from "@/lib/auth/client";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setError(null);
    setSuccess(null);

    const response = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });

    if (response.error) {
      setError(
        response.error.message ||
          "Unable to send reset instructions. Try again later.",
      );
      return;
    }

    setSuccess("If an account exists, reset instructions have been sent.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <AuthField label="Email address" error={errors.email?.message}>
        <CampusInput
          {...register("email")}
          autoComplete="email"
          invalid={Boolean(errors.email)}
          placeholder="you@university.edu"
          type="email"
        />
      </AuthField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Send reset link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
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
