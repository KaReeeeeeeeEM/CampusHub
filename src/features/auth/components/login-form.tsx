"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
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
import { getSafeCallbackUrl } from "@/lib/auth/redirects";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);

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

  async function signInWithPasskey() {
    setError(null);
    setSuccess(null);
    setIsPasskeySubmitting(true);

    const response = await authClient.signIn.passkey({
      autoFill: false,
      fetchOptions: {
        onSuccess() {
          router.replace(callbackUrl);
          router.refresh();
        },
      },
    });

    setIsPasskeySubmitting(false);

    if (response.error) {
      setError(
        response.error.message ||
          "Unable to sign in with a passkey. Try your password or register a passkey after login.",
      );
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}
      {success ? <AuthAlert type="success" message={success} /> : null}

      <AuthField label="Email address" error={errors.email?.message}>
        <CampusInput
          {...register("email")}
          autoComplete="email webauthn"
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

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="w-full"
          disabled={isSubmitting || isPasskeySubmitting}
          onClick={signInWithPasskey}
          type="button"
          variant="secondary"
        >
          {isPasskeySubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          )}
          Passkey
        </Button>
        <Button asChild className="w-full" type="button" variant="secondary">
          <Link
            href={`/two-factor?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Authenticator code
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link
          className="font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/verify-email"
        >
          Verify email
        </Link>
        <Link
          className="font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/employers/apply"
        >
          Employer access
        </Link>
      </div>
    </form>
  );
}
