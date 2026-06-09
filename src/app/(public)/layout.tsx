import { CustomCursor } from "@/components/public/custom-cursor";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicPageTransition } from "@/components/public/public-page-transition";

export default function PublicLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
      <PublicNavbar />
      <main>
        <PublicPageTransition>{children}</PublicPageTransition>
      </main>
      <PublicFooter />
    </div>
  );
}
