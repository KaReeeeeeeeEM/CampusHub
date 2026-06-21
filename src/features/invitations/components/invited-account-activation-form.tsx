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
  acceptInvitedAccountSchema,
  type AcceptInvitedAccountInput,
} from "@/features/invitations/lib/schemas";

type InvitedAccountActivationFormProps = {
  token: string;
  submitLabel: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: {
    code?: string;
    message: string;
  } | null;
};

function getInvitationStatusMessage(status: string) {
  switch (status) {
    case "accepted":
      return "This invitation has already been accepted.";
    case "expired":
      return "This invitation has expired. Request a new activation link.";
    case "revoked":
      return "This invitation has been revoked. Request a new activation link.";
    case "invalid":
      return "This invitation link is invalid. Check the link or request a new one.";
    default:
      return "Invitation is no longer valid. Request a new activation link.";
  }
}

export function InvitedAccountActivationForm({
  token,
  submitLabel,
}: InvitedAccountActivationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof acceptInvitedAccountSchema>,
    unknown,
    AcceptInvitedAccountInput
  >({
    resolver: zodResolver(acceptInvitedAccountSchema),
    defaultValues: {
      token,
      username: "",
      firstName: "",
      lastName: "",
      otherNames: "",
      nickname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  async function onSubmit(values: AcceptInvitedAccountInput) {
    setError(null);

    const response = await fetch("/api/onboarding/invitations/accept-account", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as ApiResponse<
      | {
          ok: true;
          userId: string;
        }
      | {
          ok: false;
          status: string;
        }
    >;

    if (!response.ok || !payload.data?.ok) {
      setError(
        payload.error?.message ??
          (!payload.data?.ok && payload.data?.status
            ? getInvitationStatusMessage(payload.data.status)
            : null) ??
          "Invitation is no longer valid. Request a new activation link.",
      );
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
      <AuthField label="Username" error={errors.username?.message}>
        <CampusInput
          {...register("username")}
          autoComplete="username"
          invalid={Boolean(errors.username)}
          placeholder="Choose a username"
        />
      </AuthField>
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
        {submitLabel}
      </Button>
    </form>
  );
}
