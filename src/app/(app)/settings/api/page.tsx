import { ApiKeysPanel } from "@/components/api-keys-panel";

export const metadata = { title: "API" };

export default function ApiSettingsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>API</h1>
          <p>Créez des clés limitées par scope pour vos scripts, imprimantes et intégrations.</p>
        </div>
      </div>
      <ApiKeysPanel />
    </>
  );
}
