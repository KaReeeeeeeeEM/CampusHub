"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
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

type PasswordInputProps = ComponentPropsWithoutRef<typeof CampusInput> & {
  visible: boolean;
  onToggleVisible: () => void;
};

function PasswordInput({
  visible,
  onToggleVisible,
  className,
  ...props
}: PasswordInputProps) {
  const Icon = visible ? FiEyeOff : FiEye;

  return (
    <div className="relative">
      <CampusInput
        {...props}
        className={["pr-11", className].filter(Boolean).join(" ")}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
        onClick={onToggleVisible}
        type="button"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function CampusAdminActivationForm({
  token,
}: CampusAdminActivationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

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
        <PasswordInput
          {...register("password")}
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          onToggleVisible={() => setPasswordVisible((visible) => !visible)}
          placeholder="Create your password"
          visible={passwordVisible}
        />
      </AuthField>
      <PasswordChecklist password={password} />
      <AuthField
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          {...register("confirmPassword")}
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          onToggleVisible={() =>
            setConfirmPasswordVisible((visible) => !visible)
          }
          placeholder="Confirm your password"
          visible={confirmPasswordVisible}
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
