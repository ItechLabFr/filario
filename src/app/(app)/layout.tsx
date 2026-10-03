import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { ensureWorkspace, getUserWorkspaces } from "@/lib/workspace";
import { isInstanceAdmin } from "@/lib/instance-settings";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const workspaces = await getUserWorkspaces(session.user.id);
  const instanceAdmin = await isInstanceAdmin(session.user.id);

  return (
    <AppShell
      workspace={workspace}
      workspaces={workspaces}
      user={{ name: session.user.name, email: session.user.email }}
      instanceAdmin={instanceAdmin}
    >
      {children}
    </AppShell>
  );
}
