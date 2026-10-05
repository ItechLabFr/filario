import { z } from "zod";
import { verifyBambuLoginCode } from "@/lib/bambu-cloud";
import { pool } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { syncBambuAccount } from "@/lib/bambu-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/),
  region: z.enum(["global", "china"]).default("global")
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const input = schema.parse(await request.json());

    const auth = await verifyBambuLoginCode(input.email, input.code, input.region);
    const encrypted = encryptSecret(auth.accessToken);
    const expiresAt = auth.expiresIn
      ? new Date(Date.now() + auth.expiresIn * 1000)
      : null;

    const result = await pool.query<{
      id: string;
      organization_id: string;
      user_id: string;
      email: string;
      region: "global" | "china";
      token_ciphertext: string;
      token_iv: string;
      token_tag: string;
    }>(
      `INSERT INTO bambu_accounts (
         organization_id, user_id, email, region,
         token_ciphertext, token_iv, token_tag, token_expires_at,
         status, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'connected',now())
       ON CONFLICT (organization_id, user_id, email, region) DO UPDATE SET
         token_ciphertext = EXCLUDED.token_ciphertext,
         token_iv = EXCLUDED.token_iv,
         token_tag = EXCLUDED.token_tag,
         token_expires_at = EXCLUDED.token_expires_at,
         status = 'connected',
         last_error = NULL,
         updated_at = now()
       RETURNING id, organization_id, user_id, email, region,
                 token_ciphertext, token_iv, token_tag`,
      [
        workspace.organizationId,
        session.user.id,
        input.email,
        input.region,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.tag,
        expiresAt
      ]
    );

    const account = result.rows[0];
    const deviceCount = account ? await syncBambuAccount(account) : 0;

    return Response.json({
      ok: true,
      deviceCount,
      message: deviceCount
        ? `${deviceCount} imprimante(s) Bambu synchronisée(s).`
        : "Compte connecté, aucune imprimante liée trouvée."
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Connexion Bambu impossible."
    }, { status: 400 });
  }
}
