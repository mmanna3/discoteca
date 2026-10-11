import type { AlbumPayload } from '../sources/spotifyEmbed';

export type LookupResult =
  | { ok: true; album: AlbumPayload; artistMissing: boolean }
  | { ok: false; error: string };

const ALBUM_ID = /^[A-Za-z0-9]{22}$/;

/**
 * Lector del embed de Spotify (necesita servidor porque esa página no tiene CORS).
 * Local: middleware de Vite. Producción: el Cloudflare Worker (VITE_ALBUM_API en .env.production).
 */
const ALBUM_API = import.meta.env.VITE_ALBUM_API || '/api/album';

/** Acepta links de open.spotify.com (con o sin /intl-xx/), URIs spotify:album:… o el ID pelado. */
export function parseAlbumId(input: string): string | null {
  const text = input.trim();
  if (ALBUM_ID.test(text)) return text;
  const uri = text.match(/spotify:album:([A-Za-z0-9]{22})/);
  if (uri) return uri[1];
  const url = text.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?album\/([A-Za-z0-9]{22})/);
  return url ? url[1] : null;
}

export function isShortLink(input: string): boolean {
  return /https?:\/\/(?:[\w-]+\.)?(?:spotify\.link|spotify\.app\.link|spoti\.fi)\//.test(input.trim());
}

export function looksLikeSpotify(input: string): boolean {
  return /spotify/.test(input);
}

/** Qué tipo de cosa pegaron, para dar un error útil si no es un álbum. */
function otherSpotifyKind(input: string): string | null {
  const m = input.match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(track|playlist|artist|episode|show)/);
  return m ? m[1] : null;
}

const KIND_ES: Record<string, string> = {
  track: 'una canción',
  playlist: 'una playlist',
  artist: 'un artista',
  episode: 'un episodio',
  show: 'un podcast',
};

/** Si la API propia no responde, oEmbed (público, con CORS) da al menos título y tapa. */
async function lookupViaOEmbed(id: string): Promise<LookupResult> {
  const res = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/album/${id}`)}`,
  );
  if (!res.ok) return { ok: false, error: 'No encontré ese disco en Spotify.' };
  const data: { title?: string; thumbnail_url?: string } = await res.json();
  return {
    ok: true,
    artistMissing: true,
    album: {
      id,
      title: data.title ?? '',
      artist: '',
      // Misma imagen, en 640px en lugar de 300px.
      coverUrl: (data.thumbnail_url ?? '').replace('ab67616d00001e02', 'ab67616d0000b273'),
      colors: null,
      tracks: [],
    },
  };
}

export async function lookupAlbum(input: string): Promise<LookupResult> {
  const kind = otherSpotifyKind(input);
  if (kind) return { ok: false, error: `Eso es ${KIND_ES[kind]}. Pegá el link de un álbum.` };

  const id = parseAlbumId(input);
  const short = !id && isShortLink(input);
  if (!id && !short) return { ok: false, error: 'No reconozco ese link. Copiá el link del álbum desde Spotify (Compartir → Copiar link).' };

  const query = id ? `id=${id}` : `url=${encodeURIComponent(input.trim())}`;
  try {
    const res = await fetch(`${ALBUM_API}?${query}`);
    if (res.ok) {
      const album: AlbumPayload = await res.json();
      return { ok: true, album, artistMissing: !album.artist };
    }
    if (res.status === 404) return { ok: false, error: 'No encontré ese disco en Spotify.' };
  } catch {
    // Sin API disponible: seguimos con oEmbed.
  }
  if (!id) return { ok: false, error: 'No pude abrir ese link corto. Probá con el link completo de open.spotify.com.' };
  try {
    return await lookupViaOEmbed(id);
  } catch {
    return { ok: false, error: 'No pude conectarme con Spotify. Revisá la conexión.' };
  }
}

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** En la compu abre la app de escritorio; en el celular el link web ya abre la app. */
export function spotifyAppUrl(id: string): string {
  return isMobile() ? spotifyWebUrl(id) : `spotify:album:${id}`;
}

export function spotifyWebUrl(id: string): string {
  return `https://open.spotify.com/album/${id}`;
}
