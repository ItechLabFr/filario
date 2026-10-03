import { setInstanceRegistration } from "@/app/actions";
import { SystemUpdatePanel } from "@/components/system-update-panel";
import { getInstanceSettings, isInstanceAdmin } from "@/lib/instance-settings";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Système" };
export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await requireSession();
  const admin = await isInstanceAdmin(session.user.id);

  if (!admin) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Système</h1>
            <p>Administration de l’instance Filario.</p>
          </div>
        </div>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Accès réservé</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 0 }}>
            Seul le premier compte administrateur de cette instance auto-hébergée peut modifier
            les paramètres système.
          </p>
        </section>
      </>
    );
  }

  const settings = await getInstanceSettings();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Système</h1>
          <p>Administration de votre instance Filario auto-hébergée.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Création de comptes</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Par défaut, une instance auto-hébergée n’accepte que son premier compte. Vous pouvez
          ouvrir temporairement les inscriptions pour permettre la création de nouveaux utilisateurs,
          puis les refermer.
        </p>

        <div className="kv" style={{ marginBottom: 16 }}>
          <div className="kv-item">
            <span>État</span>
            <strong>{settings.allowRegistration ? "Inscriptions ouvertes" : "Inscriptions fermées"}</strong>
          </div>
          <div className="kv-item">
            <span>Utilisateurs</span>
            <strong>{settings.userCount}</strong>
          </div>
        </div>

        <form action={setInstanceRegistration} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {settings.allowRegistration ? (
            <button className="button danger" type="submit" name="enabled" value="false">
              Bloquer les nouvelles inscriptions
            </button>
          ) : (
            <button className="button primary" type="submit" name="enabled" value="true">
              Autoriser les nouvelles inscriptions
            </button>
          )}
        </form>
      </section>

      <SystemUpdatePanel />
    </>
  );
}
