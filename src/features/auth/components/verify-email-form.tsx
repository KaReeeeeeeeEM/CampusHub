"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  verifyEmailSchema,
  type VerifyEmailInput,
} from "@/features/auth/lib/schemas";
import { authClient } from "@/lib/auth/client";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailFromQuery = searchParams.get("email") || "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(Boolean(token));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: emailFromQuery,
    },
  });

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        return;
      }

      setError(null);
      setSuccess(null);
      setIsVerifyingToken(true);

      const response = await authClient.verifyEmail({
        query: {
          token,
          callbackURL: "/verification-success",
        },
      });

      if (response.error) {
        setError(
          response.error.message ||
            "Verification link is invalid or expired. Request a new email.",
        );
        setIsVerifyingToken(false);
        return;
      }

      window.location.href = "/verification-success?verified=true";
    }

    void verifyToken();
  }, [token]);

  async function onSubmit(values: VerifyEmailInput) {
    setError(null);
    setSuccess(null);

    const response = await authClient.sendVerificationEmail({
      email: values.email,
      callbackURL: "/verification-success",
    });

    if (response.error) {
      setError(
        response.error.message ||
          "Unable to send verification email. Try again later.",
      );
      return;
    }

    setSuccess("Verification email sent. Check your inbox.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {isVerifyingToken ? (
        <AuthAlert type="info" message="Verifying your email address..." />
      ) : null}
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <AuthField label="Email address" error={errors.email?.message}>
        <CampusInput
          {...register("email")}
          autoComplete="email"
          disabled={isVerifyingToken}
          invalid={Boolean(errors.email)}
          placeholder="you@university.edu"
          type="email"
        />
      </AuthField>

      <Button
        className="w-full"
        disabled={isSubmitting || isVerifyingToken}
        type="submit"
      >
        {isSubmitting || isVerifyingToken ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Send verification email
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
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
