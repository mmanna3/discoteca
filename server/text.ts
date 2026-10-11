// Normalización de títulos y artistas para comparar lo que dice Spotify con otras fuentes.
// Es código puro: lo usan el servidor y el cliente.

const EDITION_WORDS =
  'remaster|remastered|remasterizado|deluxe|edition|edición|anniversary|aniversario|version|versión|expanded|bonus|mono|stereo|super|legacy|special|reissue|reedición|collector';

const EDITION_PARENS = new RegExp(`\\s*[(\\[][^)\\]]*\\b(?:${EDITION_WORDS})\\b[^)\\]]*[)\\]]`, 'gi');
const EDITION_SUFFIX = new RegExp(`\\s+[-–—]\\s+[^-–—]*\\b(?:${EDITION_WORDS})\\b.*$`, 'i');

/** "Abbey Road (Remastered 2009)" → "Abbey Road"; "Rumours - Super Deluxe" → "Rumours". */
export function cleanTitle(title: string): string {
  const cleaned = title.replace(EDITION_PARENS, '').replace(EDITION_SUFFIX, '').trim();
  return cleaned || title.trim();
}

/** Spotify junta varios artistas con coma; para buscar alcanza con el principal. */
export function primaryArtist(artist: string): string {
  return artist.split(/,\s+/)[0].trim();
}

/** Para comparar: sin tildes, sin puntuación, "&" = "and", sin "The" inicial. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^the\s+/, '')
    .trim();
}

export function sameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

export function yearOf(date: string | null | undefined): number | null {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isFinite(year) && year > 1800 ? year : null;
}
