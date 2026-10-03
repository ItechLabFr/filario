import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src="/brand/filario-logo-light.png" alt="Filario" />
        <h1>Créer votre atelier.</h1>
        <p>Vos données resteront exportables et compatibles avec une installation auto-hébergée.</p>
        <RegisterForm />
      </section>
    </main>
  );
}
