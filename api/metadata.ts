// Metadatos reales de un disco: año original y sello.
// 1) MusicBrainz por el link de Spotify (exacto) → 2) MusicBrainz por artista + título → 3) iTunes.

import { findBySpotifyId, searchReleaseGroup } from '../server/musicbrainz.js';
import { searchItunes } from '../server/itunes.js';
import { yearOf } from '../server/text.js';

export interface AlbumMetadata {
  year: number | null;
  releaseDate: string | null;
  label: string | null;
  releaseGroupId: string | null;
  source: 'musicbrainz-spotify' | 'musicbrainz-busqueda' | 'itunes' | null;
}

type ApiResult = { status: number; body: AlbumMetadata | { error: string } };

export async function handleMetadataRequest(params: URLSearchParams): Promise<ApiResult> {
  const id = params.get('id') ?? '';
  const artist = params.get('artist') ?? '';
  const title = params.get('title') ?? '';
  if (!/^[A-Za-z0-9]{22}$/.test(id) || !title) return { status: 400, body: { error: 'invalid-params' } };

  try {
    const mb = (await findBySpotifyId(id)) ?? (artist ? await searchReleaseGroup(artist, title) : null);
    if (mb?.date) {
      return {
        status: 200,
        body: { year: yearOf(mb.date), releaseDate: mb.date, label: mb.label, releaseGroupId: mb.releaseGroupId, source: mb.source },
      };
    }
    const itunes = artist ? await searchItunes(artist, title) : null;
    return {
      status: 200,
      body: {
        year: yearOf(itunes?.date),
        releaseDate: itunes?.date ?? null,
        label: mb?.label ?? null,
        releaseGroupId: mb?.releaseGroupId ?? null,
        source: itunes ? 'itunes' : (mb?.source ?? null),
      },
    };
  } catch {
    return { status: 502, body: { error: 'upstream' } };
  }
}

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleMetadataRequest(new URL(request.url).searchParams);
  return Response.json(body, {
    status,
    headers: { 'cache-control': status === 200 ? 'public, s-maxage=604800' : 'no-store' },
  });
}
