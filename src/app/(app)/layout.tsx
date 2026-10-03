import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  return (
    <AppShell
      workspace={workspace}
      user={{ name: session.user.name, email: session.user.email }}
    >
      {children}
    </AppShell>
  );
}
