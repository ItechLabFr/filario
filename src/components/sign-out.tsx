"use client";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      className="button ghost small"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/login";
      }}
    >
      Déconnexion
    </button>
  );
}
