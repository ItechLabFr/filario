import { DataPortability } from "@/components/data-portability";

export const metadata = { title: "Données" };

export default function DataPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vos données</h1>
          <p>Filario ne vous enferme pas : exportez et restaurez votre atelier entre filario.fr et vos propres serveurs.</p>
        </div>
      </div>
      <DataPortability />
    </>
  );
}
