"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CampusCheckbox, CampusInput } from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthField } from "@/features/auth/components/auth-field";
import { authClient } from "@/lib/auth/client";
import { getSafeCallbackUrl } from "@/lib/auth/redirects";

const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Enter the 6-digit code from your authenticator app.")
    .max(12, "Authenticator codes are usually 6 digits."),
  trustDevice: z.boolean(),
});

type TwoFactorInput = z.infer<typeof twoFactorSchema>;

export function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TwoFactorInput>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: "",
      trustDevice: true,
    },
  });

  async function onSubmit(values: TwoFactorInput) {
    setError(null);

    const response = await authClient.twoFactor.verifyTotp({
      code: values.code,
      trustDevice: values.trustDevice,
    });

    if (response.error) {
      setError(response.error.message || "Invalid authenticator code.");
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      {error ? <AuthAlert type="error" message={error} /> : null}

      <div className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-foreground">Authenticator required</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Enter the code from the authenticator app connected to your CampusHub account.
            </p>
          </div>
        </div>
      </div>

      <AuthField label="Authenticator code" error={errors.code?.message}>
        <CampusInput
          {...register("code")}
          autoComplete="one-time-code"
          inputMode="numeric"
          invalid={Boolean(errors.code)}
          placeholder="123456"
        />
      </AuthField>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <CampusCheckbox {...register("trustDevice")} />
        Trust this device for 30 days
      </label>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Verify and continue
      </Button>
    </form>
  );
}
