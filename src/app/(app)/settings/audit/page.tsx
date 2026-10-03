import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  if (!["owner", "admin"].includes(workspace.role)) {
    return (
      <div className="empty">
        <strong>Accès administrateur requis.</strong>
        Le journal d'audit contient des événements sensibles.
      </div>
    );
  }

  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, workspace.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(250);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Journal d'audit</h1>
          <p>Les opérations sensibles et modifications importantes de cet atelier.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty"><strong>Aucun événement.</strong>Les actions sensibles apparaîtront ici.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{dateTime(row.createdAt)}</td>
                  <td><code>{row.action}</code></td>
                  <td>{row.targetType || "—"}{row.targetId ? ` · ${row.targetId}` : ""}</td>
                  <td><code>{row.userId || "système"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
