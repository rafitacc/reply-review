"use client";

import { useState, useTransition } from "react";

import { signOut, switchUser } from "@/lib/auth/actions";
import type { DemoUser } from "@/lib/demo-users";

type Props = {
  users: readonly DemoUser[];
  currentEmail: string | null;
};

// Deliberately unstyled; redesigned in PR 3.
export function UserSwitcher({ users, currentEmail }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(email: string) {
    setError(null);
    startTransition(async () => {
      const result = await switchUser(email);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <label>
        Acting as{" "}
        <select
          value={currentEmail ?? ""}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            Choose a demo user
          </option>
          {users.map((user) => (
            <option key={user.email} value={user.email}>
              {user.name} ({user.label})
            </option>
          ))}
        </select>
      </label>{" "}
      {currentEmail && (
        <button type="button" disabled={pending} onClick={() => startTransition(() => signOut())}>
          Sign out
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
