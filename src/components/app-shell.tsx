import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out";
import {
  DesktopNavigation,
  MobileBottomNavigation,
  MobileMenuLinks
} from "@/components/app-navigation";
import { switchWorkspace } from "@/app/actions";
import type { Workspace, WorkspaceChoice } from "@/lib/workspace";

export function AppShell({
  children,
  workspace,
  workspaces,
  user,
  instanceAdmin
}: {
  children: React.ReactNode;
  workspace: Workspace;
  workspaces: WorkspaceChoice[];
  user: { name: string; email: string };
  instanceAdmin: boolean;
}) {
  const initials = (user.name || user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell workshop-shell">
      <aside className="sidebar workshop-sidebar">
        <div className="sidebar-head workshop-sidebar-head">
          <Link href="/dashboard" className="brand" aria-label="Filario">
            <img className="light-logo" src="/brand/filario-logo-light.png" alt="Filario" />
            <img className="dark-logo" src="/brand/filario-logo-dark.png" alt="Filario" />
          </Link>
          <span className="edition-badge">LOCAL</span>
        </div>

        <div className="workspace-card workshop-card">
          <div className="workspace-mark">{workspace.organizationName.slice(0, 1).toUpperCase()}</div>
          <div>
            <span>Workspace</span>
            <strong>{workspace.organizationName}</strong>
          </div>
        </div>

        <DesktopNavigation instanceAdmin={instanceAdmin} />

        <div className="sidebar-footer workshop-sidebar-footer">
          {workspaces.length > 1 && (
            <form action={switchWorkspace} className="workspace-switch">
              <select className="select" name="organizationId" defaultValue={workspace.organizationId}>
                {workspaces.map((item) => (
                  <option key={item.organizationId} value={item.organizationId}>
                    {item.organizationName} · {item.role}
                  </option>
                ))}
              </select>
              <button className="button small" type="submit">OK</button>
            </form>
          )}

          <div className="user-card">
            <div className="avatar">{initials || "F"}</div>
            <div className="user-card-copy">
              <strong>{user.name || user.email}</strong>
              <span>{instanceAdmin ? "Admin instance · " : ""}{workspace.role}</span>
            </div>
          </div>

          <div className="sidebar-utility-row">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="main workshop-main">
        <header className="topbar workshop-topbar">
          <Link href="/dashboard" className="mobile-brand" aria-label="Filario">
            <img className="light-logo" src="/brand/filario-icon-light.png" alt="" />
            <img className="dark-logo" src="/brand/filario-icon-dark.png" alt="" />
            <span>Filario</span>
          </Link>

          <div className="topbar-context">
            <span className="status-dot" />
            <strong>{workspace.organizationName}</strong>
            <span className="topbar-context-separator">/</span>
            <span>Atelier</span>
          </div>

          <div className="topbar-actions">
            <Link className="topbar-quick-action desktop-only" href="/inventory/new">
              + Bobine
            </Link>
            <Link className="topbar-quick-action desktop-only" href="/printers">
              Machines
            </Link>
            <div className="desktop-only"><ThemeToggle /></div>

            <details className="mobile-menu">
              <summary aria-label="Ouvrir le menu du compte">
                <span className="avatar small">{initials || "F"}</span>
              </summary>
              <div className="mobile-menu-popover">
                <div className="mobile-menu-user">
                  <strong>{user.name || user.email}</strong>
                  <span>{user.email}</span>
                </div>
                <MobileMenuLinks instanceAdmin={instanceAdmin} />
                <div className="mobile-menu-actions">
                  <ThemeToggle />
                  <SignOutButton />
                </div>
              </div>
            </details>
          </div>
        </header>

        <div className="content workshop-content">{children}</div>
      </main>

      <MobileBottomNavigation />
    </div>
  );
}
