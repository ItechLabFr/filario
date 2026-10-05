import { z } from "zod";
import { sendBambuLoginCode } from "@/lib/bambu-cloud";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email(),
  region: z.enum(["global", "china"]).default("global")
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    await ensureWorkspace(session.user);
    const input = schema.parse(await request.json());
    await sendBambuLoginCode(input.email, input.region);

    return Response.json({
      ok: true,
      message: "Code Bambu envoyé par e-mail."
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Impossible d’envoyer le code Bambu."
    }, { status: 400 });
  }
}
