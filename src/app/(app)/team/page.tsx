import { addTeamMember, removeTeamMember, updateTeamMemberRole } from "@/app/actions";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Équipe" };

type MemberRow = {
  membership_id: string;
  user_id: string;
  role: string;
  created_at: string;
  name: string;
  email: string;
};

export default async function TeamPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const canManage = ["owner", "admin"].includes(workspace.role);

  const result = await pool.query<MemberRow>(
    `SELECT
       m.id AS membership_id,
       m.user_id,
       m.role,
       m.created_at,
       u.name,
       u.email
     FROM memberships m
     JOIN "user" u ON u.id = m.user_id
     WHERE m.organization_id = $1
     ORDER BY
       CASE m.role
         WHEN 'owner' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'manager' THEN 3
         WHEN 'member' THEN 4
         ELSE 5
       END,
       lower(u.name)`,
    [workspace.organizationId]
  );

  const members = result.rows;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Équipe</h1>
          <p>Gérez les personnes qui peuvent accéder à {workspace.organizationName}.</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Membres</h2>
          <div className="grid">
            {members.map((member) => (
              <article className="card flat" key={member.membership_id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{member.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{member.email}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>Depuis {dateTime(member.created_at)}</div>
                  </div>
                  <span className="pill">{member.role}</span>
                </div>

                {canManage && (
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    <form action={updateTeamMemberRole} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="membershipId" value={member.membership_id} />
                      <select className="select" name="role" defaultValue={member.role} style={{ minHeight: 34 }}>
                        {["owner","admin","manager","member","viewer"].map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <button className="button small" type="submit">Modifier</button>
                    </form>
                    {member.user_id !== session.user.id && (
                      <form action={removeTeamMember}>
                        <input type="hidden" name="membershipId" value={member.membership_id} />
                        <button className="button danger small" type="submit">Retirer</button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Ajouter un membre</h2>
          {canManage ? (
            <>
              <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Dans cette première version, la personne doit déjà posséder un compte sur cette instance Filario.
              </p>
              <form action={addTeamMember} className="form">
                <div className="field">
                  <label>Adresse e-mail</label>
                  <input className="input" type="email" name="email" required />
                </div>
                <div className="field">
                  <label>Rôle</label>
                  <select className="select" name="role" defaultValue="member">
                    <option value="viewer">Viewer — lecture</option>
                    <option value="member">Member — utilisation</option>
                    <option value="manager">Manager — gestion atelier</option>
                    <option value="admin">Admin — administration</option>
                    {workspace.role === "owner" && <option value="owner">Owner — propriétaire</option>}
                  </select>
                </div>
                <button className="button primary" type="submit">Ajouter à l'atelier</button>
              </form>
            </>
          ) : (
            <div className="empty">
              <strong>Accès en lecture.</strong>
              Un propriétaire ou administrateur peut modifier l'équipe.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
