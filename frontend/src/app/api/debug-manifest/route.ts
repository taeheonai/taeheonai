import { promises as fs } from 'node:fs';
import path from 'path';

export async function GET() {
  try {
    const file = await fs.readFile(path.join(process.cwd(), 'public', 'manifest.webmanifest'), 'utf8');
    return new Response(file, { headers: { 'content-type': 'application/manifest+json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
