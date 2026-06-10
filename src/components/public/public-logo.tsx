import Image from "next/image";
import Link from "next/link";

export function PublicLogo() {
  return (
    <Link
      aria-label="CampusHub home"
      className="flex shrink-0 items-center gap-3"
      href="/"
    >
      <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-md sm:h-14 sm:w-14">
        <Image
          src="/logo.png"
          alt=""
          width={56}
          height={56}
          className="h-full w-full object-contain"
          sizes="(min-width: 640px) 56px, 48px"
          priority
        />
      </span>
    </Link>
  );
}
