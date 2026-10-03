import { TwoFactorForm } from "@/components/two-factor-form";

export default function TwoFactorPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src="/brand/filario-logo-light.png" alt="Filario" />
        <h1>Vérification MFA</h1>
        <p>Saisissez le code généré par votre application d'authentification.</p>
        <TwoFactorForm />
      </section>
    </main>
  );
}
