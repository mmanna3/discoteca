import type { Album } from './types';

/** Filtros de la búsqueda avanzada. Listas vacías = cualquiera. */
export interface AlbumFilters {
  yearFrom: number | null;
  yearTo: number | null;
  countries: string[];
  genres: string[];
}

export const NO_FILTERS: AlbumFilters = { yearFrom: null, yearTo: null, countries: [], genres: [] };

export const hasFilters = (f: AlbumFilters) =>
  f.yearFrom !== null || f.yearTo !== null || f.countries.length > 0 || f.genres.length > 0;

/** Con un filtro de año puesto, los discos sin año quedan afuera (no sabemos si cumplen). */
export function matchesFilters(album: Album, f: AlbumFilters): boolean {
  if (f.yearFrom !== null && (album.year == null || album.year < f.yearFrom)) return false;
  if (f.yearTo !== null && (album.year == null || album.year > f.yearTo)) return false;
  if (f.countries.length && (!album.country || !f.countries.includes(album.country))) return false;
  if (f.genres.length && (!album.genre || !f.genres.includes(album.genre))) return false;
  return true;
}

/** La búsqueda por texto recién filtra a partir de esta cantidad de caracteres. */
export const MIN_QUERY_LENGTH = 3;

/** Sin tildes ni mayúsculas: "bjork" encuentra "Björk". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es');

export function matchesQuery(album: Album, query: string): boolean {
  const q = fold(query.trim());
  if (q.length < MIN_QUERY_LENGTH) return true;
  return fold(album.title).includes(q) || fold(album.artist).includes(q);
}
