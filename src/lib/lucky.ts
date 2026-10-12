import type { Album } from './types';

/** Filtros de "Toca toca, la suerte es loca". Listas vacías = cualquiera. */
export interface LuckyFilters {
  yearFrom: number | null;
  yearTo: number | null;
  countries: string[];
  genres: string[];
}

export const NO_FILTERS: LuckyFilters = { yearFrom: null, yearTo: null, countries: [], genres: [] };

/** Con un filtro de año puesto, los discos sin año quedan afuera (no sabemos si cumplen). */
export function matchesLucky(album: Album, f: LuckyFilters): boolean {
  if (f.yearFrom !== null && (album.year == null || album.year < f.yearFrom)) return false;
  if (f.yearTo !== null && (album.year == null || album.year > f.yearTo)) return false;
  if (f.countries.length && (!album.country || !f.countries.includes(album.country))) return false;
  if (f.genres.length && (!album.genre || !f.genres.includes(album.genre))) return false;
  return true;
}

const KEY = 'discoteca:filtros-suerte';

export function loadLuckyFilters(): LuckyFilters {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LuckyFilters> | null;
    if (!saved) return NO_FILTERS;
    const year = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return { yearFrom: year(saved.yearFrom), yearTo: year(saved.yearTo), countries: strings(saved.countries), genres: strings(saved.genres) };
  } catch {
    return NO_FILTERS;
  }
}

export function saveLuckyFilters(filters: LuckyFilters) {
  try {
    localStorage.setItem(KEY, JSON.stringify(filters));
  } catch {
    // Sin almacenamiento: los filtros duran lo que dura la pestaña.
  }
}
