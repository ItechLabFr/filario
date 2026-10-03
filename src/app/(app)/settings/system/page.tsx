import { SystemUpdatePanel } from "@/components/system-update-panel";

export const metadata = { title: "Système" };

export default function SystemPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Système</h1>
          <p>Mises à jour sécurisées de votre instance Filario auto-hébergée.</p>
        </div>
      </div>
      <SystemUpdatePanel />
    </>
  );
}
