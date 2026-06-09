import { redirectAuthenticatedUser } from "@/lib/auth/route-guards";

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen bg-background text-foreground">{children}</main>
  );
}
