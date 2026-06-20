import { redirectAuthenticatedUser } from "@/lib/auth/route-guards";
import { PublicThemeProvider } from "@/providers/public-theme-provider";

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await redirectAuthenticatedUser();

  return (
    <PublicThemeProvider>
      <main className="public-brand-surface min-h-screen bg-background text-foreground">
        {children}
      </main>
    </PublicThemeProvider>
  );
}
