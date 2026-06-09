import Image from "next/image";
import Link from "next/link";

export function PublicLogo() {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="relative h-20 w-56 overflow-hidden rounded-md sm:h-24 sm:w-72">
        <Image
          src="/logo.png"
          alt="CampusHub logo"
          fill
          className="object-contain"
          sizes="(min-width: 640px) 288px, 224px"
          priority
        />
      </span>
    </Link>
  );
}
