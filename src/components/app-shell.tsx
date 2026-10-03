import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out";
import type { Workspace } from "@/lib/workspace";

export function AppShell({
  children,
  workspace,
  user
}: {
  children: React.ReactNode;
  workspace: Workspace;
  user: { name: string; email: string };
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand" aria-label="Filario">
          <img className="light-logo" src="/brand/filario-logo-light.svg" alt="Filario" />
          <img className="dark-logo" src="/brand/filario-logo-dark.svg" alt="Filario" />
        </Link>

        <nav className="nav">
          <div className="nav-label">Atelier</div>
          <Link href="/dashboard">Vue d'ensemble</Link>
          <Link href="/inventory">Bobines</Link>
          <Link href="/locations">Emplacements</Link>
          <Link href="/printers">Imprimantes</Link>
          <Link href="/jobs">Impressions</Link>

          <div className="nav-label">Compte</div>
          <Link href="/settings/security">Sécurité</Link>
          <Link href="/settings/api">API</Link>
          <Link href="/settings/data">Données</Link>
          <Link href="/settings/system">Système</Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-block">
            <strong>{workspace.organizationName}</strong>
            <span>{workspace.role} · {user.email}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="topbar-title">{workspace.organizationName}</span>
          <div className="topbar-actions">
            <ThemeToggle />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
