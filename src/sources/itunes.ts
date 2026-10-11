// iTunes Search API: pública, sin clave y con CORS abierto (la usa también el navegador).

import { cleanTitle, normalize, primaryArtist, sameText } from './text';

interface ItunesAlbum { collectionName: string; artistName: string; releaseDate?: string; copyright?: string }

export interface ItunesMatch {
  date: string | null;
  /** Ej.: "℗ 2004 Warner Records Inc." — es de la edición digital, no del original. */
  copyright: string | null;
  source: 'itunes';
}

export async function searchItunes(artist: string, title: string): Promise<ItunesMatch | null> {
  const name = primaryArtist(artist);
  const clean = cleanTitle(title);
  const term = encodeURIComponent(`${name} ${clean}`);
  const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=25`);
  if (!res.ok) return null;
  const { results = [] }: { results?: ItunesAlbum[] } = await res.json();

  const match = results.find(
    (r) => normalize(r.artistName) === normalize(name) && sameText(cleanTitle(r.collectionName), clean),
  );
  return match
    ? { date: match.releaseDate?.slice(0, 10) ?? null, copyright: match.copyright ?? null, source: 'itunes' }
    : null;
}
