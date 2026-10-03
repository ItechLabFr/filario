import Link from "next/link";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: "min(720px, 100%)" }}>
        <img className="auth-logo" src="/brand/filario-logo-light.png" alt="Filario" />
        <h1>Votre filament, parfaitement organisé.</h1>
        <p>
          Inventaire, poids restant, QR codes, emplacements, imprimantes, sécurité MFA
          et portabilité complète entre Filario Cloud et votre propre serveur.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button primary" href={session?.user ? "/dashboard" : "/register"}>
            {session?.user ? "Ouvrir Filario" : "Créer mon espace"}
          </Link>
          {!session?.user && <Link className="button" href="/login">Se connecter</Link>}
        </div>
      </section>
    </main>
  );
}
