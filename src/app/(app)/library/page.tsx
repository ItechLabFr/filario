import Link from "next/link";
import { saveMakerProfile, setPublishedModelVisibility } from "@/app/actions";
import { ModelPublisher } from "@/components/model-publisher";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Bibliothèque" };
export const dynamic = "force-dynamic";

type MakerRow = {
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  is_public: boolean;
};

type ModelRow = {
  id: string;
  slug: string;
  title: string;
  visibility: "private" | "unlisted" | "public";
  license: string;
  file_size_bytes: number;
  profile_metadata: Record<string, unknown>;
  download_count: number;
  created_at: string;
};

function suggestedHandle(name: string, email: string) {
  const value = (name || email.split("@")[0] || "maker")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return value.length >= 3 ? value : `maker-${value || "filario"}`;
}

export default async function LibraryPage() {
  const session = await requireSession();

  const [makerResult, modelsResult] = await Promise.all([
    pool.query<MakerRow>(
      `SELECT handle, display_name, bio, avatar_url, website_url, is_public
       FROM maker_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [session.user.id]
    ),
    pool.query<ModelRow>(
      `SELECT id, slug, title, visibility, license, file_size_bytes,
              profile_metadata, download_count, created_at
       FROM published_models
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [session.user.id]
    )
  ]);

  const maker = makerResult.rows[0] ?? null;
  const models = modelsResult.rows;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Creator tools</span>
          <h1>Bibliothèque</h1>
          <p>Importez vos projets 3MF, analysez leurs profils et publiez-les avec un aperçu 3D.</p>
        </div>
        <Link className="button" href="/discover">Explorer Discover</Link>
      </div>

      <div className="grid grid-2 library-layout" style={{ alignItems: "start" }}>
        <section className="card maker-profile-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Profil maker</span>
              <h2>Votre identité publique</h2>
            </div>
            {maker?.is_public && (
              <Link className="button small" href={`/makers/${maker.handle}`}>
                Voir le profil
              </Link>
            )}
          </div>

          <form action={saveMakerProfile} className="form">
            <div className="form-row">
              <div className="field">
                <label>Nom affiché</label>
                <input
                  className="input"
                  name="displayName"
                  defaultValue={maker?.display_name || session.user.name}
                  required
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label>Identifiant</label>
                <div className="input-prefix">
                  <span>@</span>
                  <input
                    className="input"
                    name="handle"
                    defaultValue={maker?.handle || suggestedHandle(session.user.name, session.user.email)}
                    required
                    pattern="[a-z0-9][a-z0-9_-]{2,31}"
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label>Bio</label>
              <textarea
                className="textarea"
                name="bio"
                defaultValue={maker?.bio || ""}
                maxLength={1000}
                placeholder="Ce que vous concevez, vos machines, votre spécialité…"
              />
            </div>

            <div className="form-row">
              <div className="field">
                <label>Avatar (URL)</label>
                <input className="input" name="avatarUrl" type="url" defaultValue={maker?.avatar_url || ""} placeholder="https://…" />
              </div>
              <div className="field">
                <label>Site web</label>
                <input className="input" name="websiteUrl" type="url" defaultValue={maker?.website_url || ""} placeholder="https://…" />
              </div>
            </div>

            <div className="visibility-choice">
              <div>
                <strong>Profil maker public</strong>
                <span>Vos modèles publics apparaissent dans Discover et sur votre profil.</span>
              </div>
              <select className="select compact-select" name="isPublic" defaultValue={maker?.is_public ? "true" : "false"}>
                <option value="false">Privé</option>
                <option value="true">Public</option>
              </select>
            </div>

            <button className="button primary" type="submit">Enregistrer le profil</button>
          </form>
        </section>

        <ModelPublisher canPublishPublic={Boolean(maker?.is_public)} />
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Vos créations</span>
            <h2>Modèles importés</h2>
          </div>
          <span className="pill">{models.length} modèle(s)</span>
        </div>

        {models.length === 0 ? (
          <div className="empty model-empty">
            <strong>Aucun modèle importé.</strong>
            Déposez votre premier fichier 3MF pour créer sa fiche et son aperçu interactif.
          </div>
        ) : (
          <div className="model-grid">
            {models.map((model) => {
              const metadata = model.profile_metadata as {
                printerModel?: string | null;
                filamentTypes?: string[];
                layerHeight?: string | null;
                plateCount?: number;
              };

              return (
                <article className="model-card" key={model.id}>
                  <Link href={`/models/${model.slug}`} className="model-card-visual">
                    <span className="model-cube">3D</span>
                    <span className="model-card-status">{model.visibility}</span>
                  </Link>
                  <div className="model-card-body">
                    <Link href={`/models/${model.slug}`}><h3>{model.title}</h3></Link>
                    <div className="model-meta-row">
                      {metadata.printerModel && <span>{metadata.printerModel}</span>}
                      {metadata.layerHeight && <span>{metadata.layerHeight} mm</span>}
                      {metadata.filamentTypes?.[0] && <span>{metadata.filamentTypes[0]}</span>}
                      <span>{metadata.plateCount || 1} plateau(x)</span>
                    </div>
                    <form action={setPublishedModelVisibility} className="model-visibility-form">
                      <input type="hidden" name="modelId" value={model.id} />
                      <select className="select" name="visibility" defaultValue={model.visibility}>
                        <option value="private">Privé</option>
                        <option value="unlisted">Non répertorié</option>
                        <option value="public" disabled={!maker?.is_public}>Public</option>
                      </select>
                      <button className="button small" type="submit">Appliquer</button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
