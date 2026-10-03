import Link from "next/link";
import { eq } from "drizzle-orm";
import { createSpool } from "@/app/actions";
import { CatalogPicker } from "@/components/catalog-picker";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Ajouter une bobine" };

export default async function NewSpoolPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const places = await db.select().from(locations).where(eq(locations.organizationId, workspace.organizationId));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Nouvelle matière</div>
          <h1>Ajouter une bobine</h1>
          <p>Recherchez d’abord la référence, puis complétez uniquement ce qui manque.</p>
        </div>
        <Link className="button" href="/inventory">Annuler</Link>
      </div>

      <form action={createSpool} className="form">
        <section className="card elevated">
          <div className="eyebrow">Catalogue</div>
          <h2 style={{ margin: "0 0 14px" }}>Trouver le filament</h2>
          <CatalogPicker />
        </section>

        <input type="hidden" name="externalSource" />
        <input type="hidden" name="externalId" />
        <input type="hidden" name="spoolWeightG" />
        <input type="hidden" name="densityGCm3" />

        <section className="card">
          <div className="eyebrow">Identité</div>
          <h2 style={{ margin: "0 0 16px" }}>Référence et couleur</h2>
          <div className="form-row">
          <div className="field">
            <label>Fabricant *</label>
            <input className="input" name="manufacturer" placeholder="Polymaker" required />
          </div>
          <div className="field">
            <label>Gamme / produit *</label>
            <input className="input" name="productName" placeholder="PolyLite PLA" required />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Matière *</label>
            <select className="select" name="material" defaultValue="PLA">
              {["PLA","PETG","ABS","ASA","TPU","PA","PC","PVA","HIPS","PEEK","OTHER"].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Diamètre</label>
            <select className="select" name="diameterMm" defaultValue="1.75">
              <option value="1.75">1,75 mm</option>
              <option value="2.85">2,85 mm</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Nom de couleur</label>
            <input className="input" name="colorName" placeholder="Jet Black" />
          </div>
          <div className="field">
            <label>Couleur</label>
            <input className="input" name="colorHex" type="color" defaultValue="#202327" style={{ padding: 5 }} />
          </div>
        </div>

          </div>

          <div className="form-row">
          <div className="field">
            <label>Poids initial (g)</label>
            <input className="input" name="initialWeightG" type="number" min="1" defaultValue="1000" required />
          </div>
          <div className="field">
            <label>Poids restant (g)</label>
            <input className="input" name="remainingWeightG" type="number" min="0" defaultValue="1000" required />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Emplacement</label>
            <select className="select" name="locationId" defaultValue="">
              <option value="">Non classé</option>
              {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Prix d'achat (€)</label>
            <input className="input" name="purchasePrice" type="number" min="0" step="0.01" placeholder="24.90" />
          </div>
        </div>

        </section>

        <section className="card">
          <div className="eyebrow">Réglages</div>
          <h2 style={{ margin: "0 0 16px" }}>Paramètres techniques</h2>
        <div className="form-row">
          <div className="field">
            <label>Buse min / max (°C)</label>
            <div className="form-row">
              <input className="input" name="nozzleMinC" type="number" placeholder="190" />
              <input className="input" name="nozzleMaxC" type="number" placeholder="230" />
            </div>
          </div>
          <div className="field">
            <label>Plateau min / max (°C)</label>
            <div className="form-row">
              <input className="input" name="bedMinC" type="number" placeholder="40" />
              <input className="input" name="bedMaxC" type="number" placeholder="60" />
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Séchage (°C)</label>
            <input className="input" name="dryingTempC" type="number" placeholder="55" />
          </div>
          <div className="field">
            <label>Date d'achat</label>
            <input className="input" name="purchasedAt" type="date" />
          </div>
        </div>

          <div className="field">
            <label>Notes</label>
            <textarea className="textarea" name="notes" placeholder="Réglages, lot, observations…" />
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Link className="button" href="/inventory">Annuler</Link>
          <button className="button primary" type="submit">Créer la bobine</button>
        </div>
      </form>
    </>
  );
}
