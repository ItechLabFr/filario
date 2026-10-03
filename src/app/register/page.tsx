import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getInstanceSettings } from "@/lib/instance-settings";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const settings = await getInstanceSettings();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src="/brand/filario-logo-light.png" alt="Filario" />
        {settings.registrationAllowed ? (
          <>
            <h1>{settings.bootstrap ? "Créer le compte administrateur." : "Créer votre atelier."}</h1>
            <p>
              {settings.bootstrap
                ? "Le premier compte de cette instance auto-hébergée devient l’administrateur Filario."
                : "Les inscriptions sont actuellement autorisées par l’administrateur de l’instance."}
            </p>
            <RegisterForm />
          </>
        ) : (
          <>
            <h1>Inscriptions fermées.</h1>
            <p>
              L’administrateur de cette instance Filario a désactivé la création de nouveaux comptes.
            </p>
            <div className="auth-switch">
              Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
