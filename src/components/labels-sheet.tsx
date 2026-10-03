"use client";

type LabelSpool = {
  id: string;
  publicId: string;
  manufacturer: string;
  productName: string;
  material: string;
  colorName: string | null;
  colorHex: string | null;
  remainingWeightG: number;
  nozzleMinC: number | null;
  nozzleMaxC: number | null;
};

export function LabelsSheet({ spools }: { spools: LabelSpool[] }) {
  return (
    <>
      <div className="label-toolbar">
        <button className="button primary" type="button" onClick={() => window.print()}>
          Imprimer les étiquettes
        </button>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          Format compact optimisé pour impression A4 et découpe.
        </span>
      </div>

      <div className="label-sheet">
        {spools.map((spool) => (
          <article className="spool-label" key={spool.id}>
            <div className="spool-label-main">
              <div className="spool-label-brand">{spool.manufacturer}</div>
              <div className="spool-label-product">{spool.productName}</div>
              <div className="spool-label-meta">
                <span className="spool-label-color" style={{ background: spool.colorHex || "#808080" }} />
                {spool.material}
                {spool.colorName ? ` · ${spool.colorName}` : ""}
              </div>
              <div className="spool-label-details">
                {spool.remainingWeightG} g
                {spool.nozzleMinC != null
                  ? ` · ${spool.nozzleMinC}–${spool.nozzleMaxC ?? spool.nozzleMinC} °C`
                  : ""}
              </div>
              <div className="spool-label-id">{spool.publicId}</div>
            </div>
            <img src={`/api/qr/${spool.publicId}`} alt="" />
          </article>
        ))}
      </div>
    </>
  );
}
