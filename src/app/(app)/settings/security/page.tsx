import { SecurityPanel } from "@/components/security-panel";

export const metadata = { title: "Sécurité" };

export default function SecurityPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sécurité</h1>
          <p>Renforcez l'accès à votre compte avec TOTP et passkeys.</p>
        </div>
      </div>
      <SecurityPanel />
    </>
  );
}
