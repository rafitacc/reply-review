import Link from "next/link";

import { UserSwitcher } from "@/components/auth/user-switcher";
import type { CurrentUser } from "@/lib/data/session";
import type { DemoUser } from "@/lib/demo-users";
import { NavLinks, type NavBrand } from "./nav-links";

type Props = {
  user: CurrentUser | null;
  // Null when the demo switcher is disabled.
  demoUsers: readonly DemoUser[] | null;
  ledBrands: readonly NavBrand[];
  writesReplies: boolean;
};

export function TopBar({ user, demoUsers, ledBrands, writesReplies }: Props) {
  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-medium tracking-tight">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            reply-review
          </Link>
          {user && <NavLinks ledBrands={ledBrands} writesReplies={writesReplies} />}
        </div>

        {demoUsers ? (
          <UserSwitcher users={demoUsers} current={user} />
        ) : (
          user && <span className="text-base-content/70">{user.fullName ?? user.email}</span>
        )}
      </div>
    </header>
  );
}
