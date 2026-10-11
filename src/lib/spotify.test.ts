import { describe, expect, it } from 'vitest';
import { isShortLink, parseAlbumId } from './spotify';

const ID = '4LH4d3cOWNNsVw41Gqt2kv';

describe('parseAlbumId', () => {
  it.each([
    `https://open.spotify.com/album/${ID}`,
    `https://open.spotify.com/album/${ID}?si=abc123`,
    `https://open.spotify.com/intl-es/album/${ID}?si=abc`,
    `https://open.spotify.com/embed/album/${ID}`,
    `spotify:album:${ID}`,
    `  ${ID}  `,
    `Escuchá esto: https://open.spotify.com/album/${ID}`,
  ])('reconoce %s', (input) => {
    expect(parseAlbumId(input)).toBe(ID);
  });

  it.each([
    `https://open.spotify.com/track/${ID}`,
    `https://open.spotify.com/playlist/${ID}`,
    'https://example.com/album/123',
    '',
  ])('rechaza %s', (input) => {
    expect(parseAlbumId(input)).toBeNull();
  });
});

describe('isShortLink', () => {
  it('detecta links cortos de Spotify', () => {
    expect(isShortLink('https://spotify.link/AbCdEf')).toBe(true);
    expect(isShortLink('https://spotify.app.link/AbCdEf')).toBe(true);
    expect(isShortLink(`https://open.spotify.com/album/${ID}`)).toBe(false);
  });
});
