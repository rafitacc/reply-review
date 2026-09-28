"use client";

import { useRef, useState, useTransition } from "react";

import { signOut, switchUser } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/data/session";
import type { DemoUser } from "@/lib/demo-users";

type Props = {
  users: readonly DemoUser[];
  current: CurrentUser | null;
};

// Compact dropdown for the demo's fake login. Picking a user signs in as them
// on the server (see switchUser); this component only chooses who.
export function UserSwitcher({ users, current }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    detailsRef.current?.removeAttribute("open");
    startTransition(async () => {
      const result = await action();
      if (result && typeof result === "object" && "error" in result) {
        setError(String(result.error));
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
      <details ref={detailsRef} className="dropdown dropdown-end">
        <summary
          className="btn btn-ghost btn-sm h-8 min-h-8 gap-2 px-2 font-normal"
          aria-label="Switch demo user"
        >
          {current ? (
            <>
              <Avatar name={current.fullName ?? current.email ?? "?"} />
              <span>{current.fullName ?? current.email}</span>
            </>
          ) : (
            <span className="text-base-content/70">Choose a demo user</span>
          )}
          {pending ? (
            <span className="loading loading-spinner loading-xs" aria-label="Switching" />
          ) : (
            <Chevron />
          )}
        </summary>
        <div className="dropdown-content z-10 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-1">
          <p className="px-3 pb-1 pt-2 font-mono text-xs text-base-content/60">Act as</p>
          <ul className="menu w-full p-0">
            {users.map((user) => {
              const active = user.email === current?.email;
              return (
                <li key={user.email}>
                  <button
                    type="button"
                    disabled={pending}
                    aria-current={active || undefined}
                    className={`flex items-center gap-3 py-2 ${active ? "bg-base-200" : ""}`}
                    onClick={() => (active ? detailsRef.current?.removeAttribute("open") : run(() => switchUser(user.email)))}
                  >
                    <Avatar name={user.name} />
                    <span className="flex flex-col items-start">
                      <span className={active ? "font-medium" : undefined}>{user.name}</span>
                      <span className="text-xs text-base-content/60">{user.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && (
            <>
              <div className="my-1 border-t border-base-300" />
              <ul className="menu w-full p-0">
                <li>
                  <button type="button" disabled={pending} onClick={() => run(() => signOut())}>
                    Sign out
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-6 place-items-center rounded-full border border-base-300 bg-base-200 text-xs font-medium"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
