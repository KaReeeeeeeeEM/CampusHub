import { PublicThemeProvider } from "@/providers/public-theme-provider";

export default function BootstrapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicThemeProvider>
      <main className="public-brand-surface min-h-screen bg-background text-foreground">
        {children}
      </main>
    </PublicThemeProvider>
  );
}
