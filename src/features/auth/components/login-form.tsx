"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CampusCheckbox, CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { loginSchema, type LoginInput } from "@/features/auth/lib/schemas";
import { authClient } from "@/lib/auth/client";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/constants/routes";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") || DEFAULT_AUTHENTICATED_REDIRECT;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    setSuccess(null);

    const response = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: callbackUrl,
    });

    if (response.error) {
      const message =
        response.error.message ||
        "Unable to sign in. Check your credentials and try again.";

      if (message.toLowerCase().includes("email")) {
        setError(`${message} You can request a verification email below.`);
      } else {
        setError(message);
      }
      return;
    }

    setSuccess("Signed in successfully. Redirecting...");
    router.replace(callbackUrl);
    router.refresh();
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

      <AuthField label="Password" error={errors.password?.message}>
        <CampusInput
          {...register("password")}
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          placeholder="Enter your password"
          type="password"
        />
      </AuthField>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <CampusCheckbox {...register("rememberMe")} />
          Remember me
        </label>
        <Link
          className="font-medium text-primary hover:underline"
          href="/forgot-password"
        >
          Forgot password?
        </Link>
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Login
      </Button>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link
          className="font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/register"
        >
          Create account
        </Link>
        <Link
          className="font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/verify-email"
        >
          Verify email
        </Link>
      </div>
    </form>
  );
}
