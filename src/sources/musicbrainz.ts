// MusicBrainz (metadatos) y Cover Art Archive (escaneos). Sin claves y con CORS abierto: se
// consultan directo desde el navegador. MusicBrainz pide como máximo una consulta por segundo.

import { cleanTitle, normalize, primaryArtist, sameText } from './text';

const MB = 'https://musicbrainz.org/ws/2';

let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RETRY_DELAYS = [1500, 3000, 5000];

/**
 * Serializa las consultas a MusicBrainz para respetar su límite de 1 por segundo.
 * Cuando el servidor está saturado responde 503 aunque respetemos el límite: reintentamos.
 */
function mbFetch<T>(path: string): Promise<T | null> {
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      const wait = lastCall + 1100 - Date.now();
      if (wait > 0) await sleep(wait);
      lastCall = Date.now();
      const res = await fetch(`${MB}/${path}${path.includes('?') ? '&' : '?'}fmt=json`, {
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 503 || res.status === 429) && attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw new Error(`musicbrainz ${res.status}`);
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

interface MbLabelInfo { 'catalog-number'?: string | null; label?: { name?: string } | null }
interface MbGenre { name: string; count: number }
interface MbReleaseGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string | null;
  score?: number;
  'artist-credit'?: { name: string; artist?: { id: string; country?: string | null } }[];
  genres?: MbGenre[];
}
interface MbRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'label-info'?: MbLabelInfo[];
  'release-group'?: MbReleaseGroup;
  media?: { format?: string | null }[];
  'cover-art-archive'?: { count: number; artwork: boolean };
}

export interface ReleaseGroupMatch {
  releaseGroupId: string;
  date: string | null;
  /** Sello de la edición vinculada a Spotify (solo cuando el match es exacto). */
  label: string | null;
  source: 'musicbrainz-spotify' | 'musicbrainz-busqueda';
}

const labelOf = (info?: MbLabelInfo[]) =>
  info?.map((l) => l.label?.name).find((n) => n && n !== '[no label]') ?? null;

/** Match exacto: releases de MusicBrainz que tienen cargado este link de Spotify. */
export async function findBySpotifyId(spotifyId: string): Promise<ReleaseGroupMatch | null> {
  const resource = encodeURIComponent(`https://open.spotify.com/album/${spotifyId}`);
  const url = await mbFetch<{ relations?: { release?: { id: string } }[] }>(`url?resource=${resource}&inc=release-rels`);
  const releaseId = url?.relations?.find((r) => r.release)?.release?.id;
  if (!releaseId) return null;

  const release = await mbFetch<MbRelease>(`release/${releaseId}?inc=release-groups+labels`);
  const group = release?.['release-group'];
  if (!group) return null;
  return {
    releaseGroupId: group.id,
    date: group['first-release-date'] || null,
    label: labelOf(release['label-info']),
    source: 'musicbrainz-spotify',
  };
}

const quote = (s: string) => `"${s.replace(/["\\]/g, ' ')}"`;

/** Búsqueda por artista + título limpio. Solo acepta coincidencias exactas de ambos. */
export async function searchReleaseGroup(artist: string, title: string): Promise<ReleaseGroupMatch | null> {
  const name = primaryArtist(artist);
  const clean = cleanTitle(title);
  const query = encodeURIComponent(`releasegroup:${quote(clean)} AND artist:${quote(name)}`);
  const data = await mbFetch<{ 'release-groups'?: MbReleaseGroup[] }>(`release-group?query=${query}&limit=10`);

  const candidates = (data?.['release-groups'] ?? []).filter(
    (g) =>
      (g.score ?? 0) >= 80 &&
      sameText(g.title, clean) &&
      (g['artist-credit'] ?? []).some((c) => normalize(c.name) === normalize(name)),
  );
  // Preferimos el álbum de estudio y, entre iguales, el lanzamiento más viejo (el original).
  candidates.sort(
    (a, b) =>
      Number(b['primary-type'] === 'Album') - Number(a['primary-type'] === 'Album') ||
      (a['first-release-date'] || '9999').localeCompare(b['first-release-date'] || '9999'),
  );
  const best = candidates[0];
  return best
    ? { releaseGroupId: best.id, date: best['first-release-date'] || null, label: null, source: 'musicbrainz-busqueda' }
    : null;
}

const byVotes = (genres?: MbGenre[]) => [...(genres ?? [])].sort((a, b) => b.count - a.count).map((g) => g.name);

async function artistGenres(artistId: string): Promise<string[]> {
  const artist = await mbFetch<{ genres?: MbGenre[] }>(`artist/${artistId}?inc=genres`);
  return byVotes(artist?.genres);
}

/**
 * Géneros votados en MusicBrainz, de más a menos votado: los del disco y, si no tiene,
 * los del artista principal. Sin release group, busca el artista por nombre exacto.
 */
export async function findGenres(releaseGroupId: string | null | undefined, artist: string): Promise<string[]> {
  if (releaseGroupId) {
    const group = await mbFetch<MbReleaseGroup>(`release-group/${releaseGroupId}?inc=genres+artist-credits`);
    const own = byVotes(group?.genres);
    if (own.length) return own;
    const artistId = group?.['artist-credit']?.[0]?.artist?.id;
    return artistId ? artistGenres(artistId) : [];
  }

  const name = primaryArtist(artist);
  if (!name) return [];
  const query = encodeURIComponent(`artist:${quote(name)}`);
  const found = await mbFetch<{ artists?: { id: string; name: string; score?: number }[] }>(`artist?query=${query}&limit=5`);
  // Solo si hay un único artista con ese nombre exacto: con homónimos no adivinamos.
  const exact = (found?.artists ?? []).filter((a) => (a.score ?? 0) >= 95 && sameText(a.name, name));
  return exact.length === 1 ? artistGenres(exact[0].id) : [];
}

/**
 * País del artista principal (código ISO, p. ej. "AR"). Con release group es exacto; sin él,
 * busca el artista por nombre y solo acepta si hay un único homónimo exacto.
 */
export async function findArtistCountry(releaseGroupId: string | null | undefined, artist: string): Promise<string | null> {
  if (releaseGroupId) {
    const group = await mbFetch<MbReleaseGroup>(`release-group/${releaseGroupId}?inc=artist-credits`);
    return group?.['artist-credit']?.[0]?.artist?.country ?? null;
  }
  const name = primaryArtist(artist);
  if (!name) return null;
  const query = encodeURIComponent(`artist:${quote(name)}`);
  const found = await mbFetch<{ artists?: { name: string; score?: number; country?: string | null }[] }>(
    `artist?query=${query}&limit=5`,
  );
  const exact = (found?.artists ?? []).filter((a) => (a.score ?? 0) >= 95 && sameText(a.name, name));
  return exact.length === 1 ? (exact[0].country ?? null) : null;
}

export interface SpineScan {
  releaseId: string;
  image: string;
  thumb: string;
  /** Tipos de la imagen según Cover Art Archive (p. ej. ["Back", "Spine"] = contratapa con lomos). */
  types: string[];
  country: string | null;
  date: string | null;
  format: string | null;
  label: string | null;
  catalogNumber: string | null;
}

interface CaaImage { types: string[]; image: string; thumbnails: Record<string, string> }

const https = (url: string) => url.replace(/^http:/, 'https:');

async function caaImages(releaseId: string): Promise<CaaImage[]> {
  try {
    const res = await fetch(`https://coverartarchive.org/release/${releaseId}`, {
      headers: { accept: 'application/json' },
    });
    return res.ok ? ((await res.json()) as { images: CaaImage[] }).images : [];
  } catch {
    return [];
  }
}

const MAX_RELEASES = 30;
const CONCURRENCY = 6;

/** Escaneos reales de lomos de todas las ediciones de un disco, priorizando las ediciones en CD. */
export async function findSpineScans(releaseGroupId: string): Promise<SpineScan[]> {
  const data = await mbFetch<{ releases?: MbRelease[] }>(
    `release?release-group=${releaseGroupId}&inc=media+labels&limit=100`,
  );
  const isCd = (r: MbRelease) => r.media?.some((m) => m.format?.includes('CD')) ?? false;
  const releases = (data?.releases ?? [])
    .filter((r) => r['cover-art-archive']?.artwork && r['cover-art-archive'].count >= 2)
    .sort((a, b) => Number(isCd(b)) - Number(isCd(a)) || b['cover-art-archive']!.count - a['cover-art-archive']!.count)
    .slice(0, MAX_RELEASES);

  const scans: SpineScan[] = [];
  for (let i = 0; i < releases.length; i += CONCURRENCY) {
    const batch = releases.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((r) => caaImages(r.id)));
    batch.forEach((release, j) => {
      for (const img of results[j].filter((im) => im.types.includes('Spine'))) {
        const info = release['label-info']?.[0];
        scans.push({
          releaseId: release.id,
          image: https(img.thumbnails['1200'] ?? img.image),
          thumb: https(img.thumbnails['500'] ?? img.thumbnails.large ?? img.image),
          types: img.types,
          country: release.country ?? null,
          date: release.date ?? null,
          format: release.media?.map((m) => m.format).filter(Boolean).join(' + ') || null,
          label: labelOf(release['label-info']),
          catalogNumber: info?.['catalog-number'] ?? null,
        });
      }
    });
  }
  return scans;
}
