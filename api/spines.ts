// Escaneos reales de lomos (Cover Art Archive) para un release group de MusicBrainz.

import { findSpineScans, type SpineScan } from '../server/musicbrainz.js';

type ApiResult = { status: number; body: { scans: SpineScan[] } | { error: string } };

export async function handleSpinesRequest(params: URLSearchParams): Promise<ApiResult> {
  const rg = params.get('rg') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(rg)) return { status: 400, body: { error: 'invalid-id' } };
  try {
    return { status: 200, body: { scans: await findSpineScans(rg) } };
  } catch {
    return { status: 502, body: { error: 'upstream' } };
  }
}

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleSpinesRequest(new URL(request.url).searchParams);
  return Response.json(body, {
    status,
    headers: { 'cache-control': status === 200 ? 'public, s-maxage=604800' : 'no-store' },
  });
}
