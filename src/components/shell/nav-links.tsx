"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

export type NavBrand = { name: string; slug: string };

type Props = {
  // Brands the user leads. Empty for someone who only writes replies.
  ledBrands: readonly NavBrand[];
  // True when the user is a specialist on at least one brand.
  writesReplies: boolean;
};

// Links by role. This is navigation only: every page checks access again on
// the server, and RLS decides what data comes back.
export function NavLinks({ ledBrands, writesReplies }: Props) {
  const pathname = usePathname();
  const brandsRef = useRef<HTMLDetailsElement>(null);
  const isActive = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {ledBrands.length > 0 && (
        <>
          <NavLink href="/review" active={isActive("/review")}>
            Review
          </NavLink>
          <details ref={brandsRef} className="dropdown">
            <summary
              className={`${linkClass(isActive("/brands"))} flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden`}
            >
              Brands
              <svg aria-hidden viewBox="0 0 16 16" className="size-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6l4 4 4-4" />
              </svg>
            </summary>
            <ul className="dropdown-content menu z-10 mt-1 w-48 rounded-box border border-base-300 bg-base-100 p-1">
              {ledBrands.map((brand) => (
                <li key={brand.slug}>
                  <Link
                    href={`/brands/${brand.slug}`}
                    aria-current={pathname === `/brands/${brand.slug}` ? "page" : undefined}
                    onClick={() => brandsRef.current?.removeAttribute("open")}
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      {writesReplies && (
        <NavLink href="/feedback" active={isActive("/feedback")}>
          My feedback
        </NavLink>
      )}
    </nav>
  );
}

function linkClass(active: boolean): string {
  return `rounded-field px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
    active ? "bg-base-200 font-medium text-base-content" : "text-base-content/60 hover:text-base-content"
  }`;
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
      {children}
    </Link>
  );
}
