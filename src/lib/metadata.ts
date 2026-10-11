import { useEffect, useRef } from 'react';
import type { AlbumMetadata } from '../../api/metadata';
import type { SpineScan } from '../../server/musicbrainz';
import { searchItunes } from '../../server/itunes';
import { yearOf } from '../../server/text';
import type { Album } from './types';

export type MetaPatch = Pick<Album, 'year' | 'releaseDate' | 'label' | 'releaseGroupId' | 'metaSource' | 'metaFetchedAt'>;

class Unreachable extends Error {}

async function viaApi(album: Pick<Album, 'id' | 'artist' | 'title'>): Promise<AlbumMetadata> {
  const params = new URLSearchParams({ id: album.id, artist: album.artist, title: album.title });
  let res: Response;
  try {
    res = await fetch(`/api/metadata?${params}`);
  } catch {
    throw new Unreachable();
  }
  if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Unreachable();
  return res.json();
}

/**
 * Busca año y sello. Si nuestra API no está disponible, intenta directo con iTunes (tiene CORS).
 * Devuelve null si no se pudo consultar ninguna fuente (para reintentar más adelante).
 */
export async function fetchMetadata(album: Pick<Album, 'id' | 'artist' | 'title'>): Promise<MetaPatch | null> {
  let meta: AlbumMetadata;
  try {
    meta = await viaApi(album);
  } catch {
    try {
      const itunes = album.artist ? await searchItunes(album.artist, album.title) : null;
      meta = {
        year: yearOf(itunes?.date),
        releaseDate: itunes?.date ?? null,
        label: null,
        releaseGroupId: null,
        source: itunes ? 'itunes' : null,
      };
    } catch {
      return null;
    }
  }
  return {
    year: meta.year,
    releaseDate: meta.releaseDate,
    label: meta.label,
    releaseGroupId: meta.releaseGroupId,
    metaSource: meta.source,
    metaFetchedAt: Date.now(),
  };
}

export async function fetchSpineScans(releaseGroupId: string): Promise<SpineScan[] | null> {
  try {
    const res = await fetch(`/api/spines?rg=${releaseGroupId}`);
    if (!res.ok) return null;
    return ((await res.json()) as { scans: SpineScan[] }).scans;
  } catch {
    return null;
  }
}

/** Completa de a uno los discos que todavía no tienen metadatos (p. ej. los guardados antes de esta función). */
export function useMetadataBackfill(albums: Album[], update: (id: string, patch: Partial<Album>) => void) {
  const inFlight = useRef<string | null>(null);
  const failed = useRef(new Set<string>());

  useEffect(() => {
    if (inFlight.current) return;
    const next = albums.find((a) => a.metaFetchedAt === undefined && !failed.current.has(a.id));
    if (!next) return;
    inFlight.current = next.id;
    void fetchMetadata(next).then((patch) => {
      inFlight.current = null;
      if (patch) update(next.id, patch);
      else failed.current.add(next.id);
    });
  }, [albums, update]);
}
