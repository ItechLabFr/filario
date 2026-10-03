import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json({
      status: "ok",
      service: "filario",
      version: process.env.npm_package_version ?? "0.1.0"
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
