import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";
import { getInstanceSettings } from "@/lib/instance-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  const settings = await getInstanceSettings();

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src="/brand/filario-logo-light.png" alt="Filario" />
        <h1>Bon retour.</h1>
        <p>Connectez-vous à votre atelier Filario.</p>
        <LoginForm registrationAllowed={settings.registrationAllowed} />
      </section>
    </main>
  );
}
