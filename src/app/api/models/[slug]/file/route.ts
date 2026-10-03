import { readFile } from "node:fs/promises";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModelRow = {
  owner_user_id: string;
  file_name: string;
  storage_path: string;
  visibility: string;
  maker_public: boolean | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await pool.query<ModelRow>(
    `SELECT
       m.owner_user_id,
       m.file_name,
       m.storage_path,
       m.visibility,
       p.is_public AS maker_public
     FROM published_models m
     LEFT JOIN maker_profiles p ON p.user_id = m.owner_user_id
     WHERE m.slug = $1
     LIMIT 1`,
    [slug]
  );

  const model = result.rows[0];
  if (!model) return new Response("Not found", { status: 404 });

  const session = await getSession();
  const owner = session?.user?.id === model.owner_user_id;
  const publicAccess =
    model.visibility === "unlisted" ||
    (model.visibility === "public" && model.maker_public === true);

  if (!owner && !publicAccess) {
    return new Response("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(model.storage_path);
  } catch {
    return new Response("Model file unavailable", { status: 404 });
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  if (download && !owner) {
    await pool.query(
      "UPDATE published_models SET download_count = download_count + 1 WHERE slug = $1",
      [slug]
    ).catch(() => undefined);
  }

  const safeName = model.file_name.replace(/[^0-9A-Za-z._ -]/g, "_");

  return new Response(bytes, {
    headers: {
      "Content-Type": "model/3mf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": publicAccess
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "private, no-store"
    }
  });
}
