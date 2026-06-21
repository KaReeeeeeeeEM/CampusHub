"use client";

import { Download, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CampusInput } from "@/components/campushub";
import { LoadingState } from "@/components/shared/loading-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

type SecurityState = {
  hasPasskey: boolean;
  passkeyCount: number;
  twoFactorEnabled: boolean;
};

type ApiResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

function extractTotpSecret(uri: string | null) {
  if (!uri) return null;

  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

export function AccountSecuritySettings() {
  const [securityState, setSecurityState] = useState<SecurityState | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const [isAuthenticatorSubmitting, setIsAuthenticatorSubmitting] =
    useState(false);
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [authenticatorModalOpen, setAuthenticatorModalOpen] = useState(false);
  const totpSecret = useMemo(() => extractTotpSecret(totpUri), [totpUri]);

  useEffect(() => {
    let active = true;

    async function loadSecurityState() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/account/security-state", {
          credentials: "include",
        });
        const body = (await response.json()) as ApiResponse<SecurityState>;

        if (active && body.data) setSecurityState(body.data);
      } catch {
        if (active) {
          toast.error("Unable to load account security settings.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadSecurityState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!totpUri) {
      setTotpQrCode(null);
      return;
    }

    let active = true;
    const uri = totpUri;

    async function createQrCode() {
      try {
        const dataUrl = await QRCode.toDataURL(uri, {
          margin: 1,
          width: 220,
        });

        if (active) setTotpQrCode(dataUrl);
      } catch {
        if (active) setTotpQrCode(null);
      }
    }

    void createQrCode();

    return () => {
      active = false;
    };
  }, [totpUri]);

  async function addPasskey() {
    setIsPasskeySubmitting(true);

    const response = await authClient.passkey.addPasskey({
      name: "CampusHub passkey",
      authenticatorAttachment: "platform",
    });

    setIsPasskeySubmitting(false);

    if (response.error) {
      toast.error(response.error.message || "Unable to create passkey.");
      return;
    }

    setSecurityState((current) =>
      current
        ? {
            ...current,
            hasPasskey: true,
            passkeyCount: current.passkeyCount + 1,
          }
        : current,
    );
    toast.success("Passkey created for this account.");
  }

  async function enableAuthenticator() {
    if (!password.trim()) {
      toast.error(
        "Enter your current password to enable authenticator app security.",
      );
      return;
    }

    setIsAuthenticatorSubmitting(true);

    const response = await authClient.twoFactor.enable({
      password,
      issuer: "CampusHub",
    });

    setIsAuthenticatorSubmitting(false);

    if (response.error) {
      toast.error(
        response.error.message || "Unable to enable authenticator app.",
      );
      return;
    }

    setTotpUri(response.data.totpURI);
    setBackupCodes(response.data.backupCodes);
    setSecurityState((current) =>
      current ? { ...current, twoFactorEnabled: true } : current,
    );
    toast.success("Authenticator app setup started.");
  }

  function downloadBackupCodes() {
    if (!backupCodes.length) return;

    const content = [
      "CampusHub authenticator app backup codes",
      "Store these somewhere private. Each code can only be used once.",
      "",
      ...backupCodes.map((code, index) => `${index + 1}. ${code}`),
      "",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `campushub-backup-codes-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return <LoadingState label="Loading account security settings" />;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex h-full flex-col justify-between gap-4 rounded-lg border border-border bg-background p-5">
          <div className="space-y-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">Passkey login</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Sign in with your fingerprint, face unlock, screen lock, or
                security key.
              </p>
            </div>
            {securityState?.hasPasskey ? (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {securityState.passkeyCount} passkey
                {securityState.passkeyCount === 1 ? "" : "s"} configured.
              </p>
            ) : null}
          </div>
          <Button
            className="w-full"
            disabled={isLoading || isPasskeySubmitting}
            onClick={addPasskey}
            type="button"
          >
            {isPasskeySubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {securityState?.hasPasskey
              ? "Add another passkey"
              : "Create passkey"}
          </Button>
        </section>

        <section className="flex h-full flex-col justify-between gap-4 rounded-lg border border-border bg-background p-5">
          <div className="space-y-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">
                Authenticator app
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Add a time-based code from Google Authenticator, Microsoft
                Authenticator, 1Password, or iCloud Passwords.
              </p>
            </div>
            {securityState?.twoFactorEnabled ? (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Authenticator app protection is enabled.
              </p>
            ) : null}
          </div>
          {securityState?.twoFactorEnabled ? null : (
            <Button
              className="w-full"
              disabled={isLoading}
              onClick={() => setAuthenticatorModalOpen(true)}
              type="button"
              variant="secondary"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Set up authenticator app
            </Button>
          )}
        </section>
      </div>

      <Modal
        className="max-w-3xl"
        description="Verify your password, then scan the setup code with your authenticator app."
        onOpenChange={setAuthenticatorModalOpen}
        open={authenticatorModalOpen}
        title="Set Up Authenticator App"
      >
        <div className="space-y-5">
          {securityState?.twoFactorEnabled ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Authenticator app protection is enabled.
            </p>
          ) : (
            <div className="grid gap-3">
              <CampusInput
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter current password"
                type="password"
                value={password}
              />
              <Button
                className="w-full"
                disabled={isLoading || isAuthenticatorSubmitting}
                onClick={enableAuthenticator}
                type="button"
              >
                {isAuthenticatorSubmitting ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                )}
                Generate setup code
              </Button>
            </div>
          )}

          {totpUri ? (
            <div className="space-y-3 rounded-md border border-border bg-surface p-3">
              {totpQrCode ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Scan setup code
                  </p>
                  <div className="mx-auto mt-2 inline-flex rounded-lg bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Authenticator app setup QR code"
                      className="h-44 w-44"
                      src={totpQrCode}
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-medium text-foreground">
                  Manual setup key
                </p>
                <code className="mt-2 block break-all rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">
                  {totpSecret ?? totpUri}
                </code>
              </div>
              {backupCodes.length ? (
                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Backup codes
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Store these somewhere private. Each code can only be
                        used once.
                      </p>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={downloadBackupCodes}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download codes
                    </Button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {backupCodes.map((code) => (
                      <code
                        className="rounded-md bg-background px-3 py-2 text-sm text-muted-foreground"
                        key={code}
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
