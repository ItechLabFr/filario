import QRCode from "qrcode";

export async function GET(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const base = process.env.FILARIO_URL || new URL(request.url).origin;
  const value = new URL(`/s/${encodeURIComponent(publicId)}`, base).toString();

  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#172026",
      light: "#ffffff"
    }
  });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="filario-${publicId}.svg"` } : {})
    }
  });
}
