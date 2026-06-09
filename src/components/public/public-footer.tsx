import Link from "next/link";

import { PublicLogo } from "@/components/public/public-logo";
import { publicNavItems } from "@/features/public-site/content";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Features", href: "/features" },
      { label: "Universities", href: "/universities" },
      { label: "Employers", href: "/employers" },
      { label: "Alumni", href: "/alumni" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <PublicLogo />
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            A premium digital ecosystem for universities, students, alumni,
            employers, and campus communities.
          </p>
          <Link
            className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
            href="/employers/apply"
          >
            Employer application
          </Link>
        </div>
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-4 space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="text-sm text-muted-foreground hover:text-foreground"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} CampusHub. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            {publicNavItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
