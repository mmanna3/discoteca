import { useEffect, useRef } from 'react';
import { searchItunes } from '../sources/itunes';
import { findBySpotifyId, findSpineScans, searchReleaseGroup, type ReleaseGroupMatch, type SpineScan } from '../sources/musicbrainz';
import { yearOf } from '../sources/text';
import type { Album } from './types';

export type MetaPatch = Pick<Album, 'year' | 'releaseDate' | 'label' | 'releaseGroupId' | 'metaSource' | 'metaFetchedAt'>;

/**
 * Año original y sello: 1) MusicBrainz por el link de Spotify (exacto) → 2) MusicBrainz por
 * artista + título limpio → 3) iTunes. Devuelve null si no se pudo consultar ninguna fuente
 * (sin conexión, etc.), para reintentar más adelante.
 */
export async function fetchMetadata(album: Pick<Album, 'id' | 'artist' | 'title'>): Promise<MetaPatch | null> {
  let mb: ReleaseGroupMatch | null = null;
  let mbFailed = false;
  try {
    mb = (await findBySpotifyId(album.id)) ?? (album.artist ? await searchReleaseGroup(album.artist, album.title) : null);
  } catch {
    mbFailed = true;
  }

  const base = { label: mb?.label ?? null, releaseGroupId: mb?.releaseGroupId ?? null, metaFetchedAt: Date.now() };
  if (mb?.date) return { ...base, year: yearOf(mb.date), releaseDate: mb.date, metaSource: mb.source };

  try {
    const itunes = album.artist ? await searchItunes(album.artist, album.title) : null;
    if (itunes) return { ...base, year: yearOf(itunes.date), releaseDate: itunes.date, metaSource: 'itunes' };
  } catch {
    if (mbFailed) return null;
  }
  return mbFailed ? null : { ...base, year: null, releaseDate: null, metaSource: mb?.source ?? null };
}

export async function fetchSpineScans(releaseGroupId: string): Promise<SpineScan[] | null> {
  try {
    return await findSpineScans(releaseGroupId);
  } catch {
    return null;
  }
}

/** Completa de a uno los discos que todavía no tienen metadatos (p. ej. los guardados antes de esta función). */
export function useMetadataBackfill(
  albums: Album[],
  update: (id: string, patch: Partial<Album>) => void,
  enabled: boolean,
) {
  const inFlight = useRef<string | null>(null);
  const failed = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || inFlight.current) return;
    const next = albums.find((a) => a.metaFetchedAt === undefined && !failed.current.has(a.id));
    if (!next) return;
    inFlight.current = next.id;
    void fetchMetadata(next).then((patch) => {
      inFlight.current = null;
      if (patch) update(next.id, patch);
      else failed.current.add(next.id);
    });
  }, [albums, update, enabled]);
}
