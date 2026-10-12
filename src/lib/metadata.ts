import { useEffect, useRef } from 'react';
import { searchItunes } from '../sources/itunes';
import { firstFamily, genreFamily } from '../sources/genres';
import {
  findArtistCountry,
  findBySpotifyId,
  findGenres,
  findSpineScans,
  searchReleaseGroup,
  type ReleaseGroupMatch,
  type SpineScan,
} from '../sources/musicbrainz';
import { yearOf } from '../sources/text';
import type { Album } from './types';

export type MetaPatch = Pick<Album, 'year' | 'releaseDate' | 'label' | 'releaseGroupId' | 'metaSource' | 'metaFetchedAt'>;
export type GenrePatch = Pick<Album, 'genre' | 'genreSource' | 'genreFetchedAt'>;
export type CountryPatch = Pick<Album, 'country' | 'countrySource' | 'countryFetchedAt'>;

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

/**
 * Familia de género: 1) géneros votados en MusicBrainz (del disco o, si no tiene, del artista)
 * → 2) género de iTunes, si coincide exactamente el disco. Si nada encaja en una familia, queda
 * vacío para elegirlo a mano. Devuelve null si no se pudo consultar ninguna fuente.
 */
export async function fetchGenre(
  album: Pick<Album, 'artist' | 'title' | 'releaseGroupId'>,
): Promise<GenrePatch | null> {
  let failures = 0;
  try {
    const family = firstFamily(await findGenres(album.releaseGroupId, album.artist));
    if (family) return { genre: family, genreSource: 'musicbrainz', genreFetchedAt: Date.now() };
  } catch {
    failures++;
  }
  try {
    const itunes = album.artist ? await searchItunes(album.artist, album.title) : null;
    const family = itunes?.genre ? genreFamily(itunes.genre) : null;
    if (family) return { genre: family, genreSource: 'itunes', genreFetchedAt: Date.now() };
  } catch {
    failures++;
  }
  return failures === 2 ? null : { genre: null, genreSource: null, genreFetchedAt: Date.now() };
}

/** País del artista según MusicBrainz. Devuelve null si no se pudo consultar (para reintentar). */
export async function fetchCountry(album: Pick<Album, 'artist' | 'releaseGroupId'>): Promise<CountryPatch | null> {
  try {
    const country = await findArtistCountry(album.releaseGroupId, album.artist);
    return { country, countrySource: country ? 'musicbrainz' : null, countryFetchedAt: Date.now() };
  } catch {
    return null;
  }
}

export async function fetchSpineScans(releaseGroupId: string): Promise<SpineScan[] | null> {
  try {
    return await findSpineScans(releaseGroupId);
  } catch {
    return null;
  }
}

/**
 * Completa de a uno los discos a los que les faltan datos: primero año y sello, después género
 * y país (que necesitan el release group). Lo elegido a mano no se toca.
 */
export function useMetadataBackfill(
  albums: Album[],
  update: (id: string, patch: Partial<Album>) => void,
  enabled: boolean,
) {
  const inFlight = useRef<string | null>(null);
  const failed = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || inFlight.current) return;
    const pending = albums.filter((a) => !failed.current.has(a.id));
    const needsMeta = pending.find((a) => a.metaFetchedAt === undefined);
    const needsGenre = pending.find((a) => a.genreFetchedAt === undefined && a.genreSource !== 'manual');
    const needsCountry = pending.find((a) => a.countryFetchedAt === undefined && a.countrySource !== 'manual');
    const next = needsMeta ?? needsGenre ?? needsCountry;
    if (!next) return;

    inFlight.current = next.id;
    const task: Promise<Partial<Album> | null> = needsMeta
      ? fetchMetadata(next)
      : needsGenre
        ? fetchGenre(next)
        : fetchCountry(next);
    void task.then((patch) => {
      inFlight.current = null;
      if (patch) update(next.id, patch);
      else failed.current.add(next.id);
    });
  }, [albums, update, enabled]);
}
