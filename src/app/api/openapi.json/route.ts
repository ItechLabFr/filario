export const dynamic = "force-static";

export async function GET() {
  const document = {
    openapi: "3.1.0",
    info: {
      title: "Filario API",
      version: "0.1.0",
      description: "API publique de gestion des bobines, imprimantes et impressions Filario."
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "fil_live_*"
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/spools": {
        get: {
          summary: "Lister les bobines",
          responses: { "200": { description: "Liste des bobines" }, "401": { description: "Clé ou scope invalide" } }
        },
        post: {
          summary: "Créer une bobine",
          responses: { "201": { description: "Bobine créée" }, "401": { description: "Clé ou scope invalide" } }
        }
      },
      "/spools/{id}": {
        get: {
          summary: "Lire une bobine",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Bobine" }, "404": { description: "Introuvable" } }
        }
      },
      "/spools/{id}/consume": {
        post: {
          summary: "Déduire une consommation",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Consommation enregistrée" } }
        }
      },
      "/printers": {
        get: {
          summary: "Lister les imprimantes",
          responses: { "200": { description: "Liste des imprimantes" } }
        }
      },
      "/jobs": {
        get: {
          summary: "Lister les impressions",
          responses: { "200": { description: "Liste des impressions" } }
        },
        post: {
          summary: "Créer une impression",
          responses: { "201": { description: "Impression créée" } }
        }
      }
    }
  };

  return Response.json(document, {
    headers: { "Cache-Control": "public, max-age=3600" }
  });
}
