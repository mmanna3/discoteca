// Cloudflare Worker: lee el embed de Spotify (que no tiene CORS) para la versión de GitHub Pages.
// GET /album?id=<id de álbum>  |  GET /album?url=<link corto spotify.link>

import { handleAlbumRequest } from '../src/sources/spotifyEmbed';

const ALLOWED_ORIGINS = [/^https:\/\/mmanna3\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const cors: Record<string, string> = ALLOWED_ORIGINS.some((re) => re.test(origin))
      ? { 'access-control-allow-origin': origin, vary: 'origin' }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET' } });
    }
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/album') return new Response('Not found', { status: 404 });

    const { status, body } = await handleAlbumRequest(url.searchParams);
    return Response.json(body, {
      status,
      headers: { ...cors, 'cache-control': status === 200 ? 'public, max-age=86400' : 'no-store' },
    });
  },
};
