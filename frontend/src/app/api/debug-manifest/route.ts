import { promises as fs } from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const p = path.join(process.cwd(), "public", "manifest.json");
    const file = await fs.readFile(p, "utf8");
    return new Response(file, { headers: { "content-type": "application/manifest+json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
