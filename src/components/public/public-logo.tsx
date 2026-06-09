import Link from "next/link";

export function PublicLogo() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        CH
      </span>
      <span className="text-base font-semibold tracking-normal">CampusHub</span>
    </Link>
  );
}
