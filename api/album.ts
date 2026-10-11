// Lee los datos reales de un álbum desde la página pública del embed de Spotify.
// No requiere login: es la misma página que Spotify sirve para el reproductor embebido.
// Corre como función serverless (Vercel) y como middleware en el dev server de Vite.

export interface AlbumPayload {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  /** Colores que Spotify calcula a partir de la tapa ("visualIdentity"). */
  colors: { background: string; text: string } | null;
  tracks: { title: string; artist: string; durationMs: number }[];
}

type ApiResult = { status: number; body: AlbumPayload | { error: string } };

const ALBUM_ID = /^[A-Za-z0-9]{22}$/;
const NEXT_DATA = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

interface Rgb { red: number; green: number; blue: number }
interface EmbedImage { url: string; maxWidth?: number }
interface EmbedTrack { title?: string; subtitle?: string; duration?: number }
interface EmbedEntity {
  type?: string;
  id?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  trackList?: EmbedTrack[];
  visualIdentity?: {
    backgroundBase?: Rgb;
    textBase?: Rgb;
    image?: EmbedImage[];
  };
}

const rgb = (c: Rgb) => `rgb(${c.red}, ${c.green}, ${c.blue})`;

/** Los links cortos (spotify.link/…) redirigen al link real del álbum. */
async function resolveShortLink(url: string): Promise<string | null> {
  const parsed = new URL(url);
  if (!/(^|\.)spotify\.link$|^spotify\.app\.link$|^spoti\.fi$/.test(parsed.hostname)) return null;
  const res = await fetch(parsed, { redirect: 'follow' });
  const match = res.url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?album\/([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}

export async function fetchAlbum(id: string): Promise<AlbumPayload | null> {
  const res = await fetch(`https://open.spotify.com/embed/album/${id}`, {
    headers: { 'accept-language': 'es' },
  });
  if (!res.ok) return null;

  const json = (await res.text()).match(NEXT_DATA)?.[1];
  if (!json) return null;
  const entity: EmbedEntity | undefined = JSON.parse(json)?.props?.pageProps?.state?.data?.entity;
  if (!entity || entity.type !== 'album') return null;

  const images = [...(entity.visualIdentity?.image ?? [])].sort(
    (a, b) => (b.maxWidth ?? 0) - (a.maxWidth ?? 0),
  );
  const { backgroundBase, textBase } = entity.visualIdentity ?? {};

  return {
    id,
    title: entity.title ?? entity.name ?? '',
    artist: entity.subtitle ?? '',
    coverUrl: images[0]?.url ?? '',
    colors: backgroundBase && textBase ? { background: rgb(backgroundBase), text: rgb(textBase) } : null,
    tracks: (entity.trackList ?? []).map((t) => ({
      title: t.title ?? '',
      artist: t.subtitle ?? '',
      durationMs: t.duration ?? 0,
    })),
  };
}

export async function handleAlbumRequest(params: URLSearchParams): Promise<ApiResult> {
  try {
    let id = params.get('id');
    const url = params.get('url');
    if (!id && url) id = await resolveShortLink(url);
    if (!id || !ALBUM_ID.test(id)) return { status: 400, body: { error: 'invalid-id' } };

    const album = await fetchAlbum(id);
    return album ? { status: 200, body: album } : { status: 404, body: { error: 'not-found' } };
  } catch {
    return { status: 502, body: { error: 'upstream' } };
  }
}

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleAlbumRequest(new URL(request.url).searchParams);
  return Response.json(body, {
    status,
    headers: { 'cache-control': status === 200 ? 'public, s-maxage=86400' : 'no-store' },
  });
}
