import { describe, expect, it } from 'vitest';
import { parseCollection, sortAlbums } from './collection';
import type { Album } from './types';

const album = (id: string, artist: string, title: string, edge: string, addedAt: number): Album => ({
  id,
  artist,
  title,
  coverUrl: '',
  tracks: [],
  palette: { base: edge, text: '#fff', edge, edgeText: '#fff' },
  spine: 'arte',
  addedAt,
});

const albums = [
  album('1', 'The Beatles', 'Abbey Road', 'rgb(40, 120, 220)', 3),
  album('2', 'Soda Stereo', 'Canción Animal', 'rgb(220, 30, 30)', 1),
  album('3', 'Almendra', 'Almendra', 'rgb(128, 128, 128)', 2),
  album('4', 'The Beatles', 'Revolver', 'rgb(240, 240, 240)', 4),
];

describe('sortAlbums', () => {
  it('ordena por artista ignorando "The", y luego por título', () => {
    expect(sortAlbums(albums, 'artista').map((a) => a.id)).toEqual(['3', '1', '4', '2']);
  });

  it('dentro de cada artista ordena por año (los sin año al final)', () => {
    const withYears = albums.map((a) => (a.id === '1' ? { ...a, year: 1969 } : a.id === '4' ? { ...a, year: 1966 } : a));
    expect(sortAlbums(withYears, 'artista').map((a) => a.id)).toEqual(['3', '4', '1', '2']);
    expect(sortAlbums(withYears, 'anio').map((a) => a.id)).toEqual(['4', '1', '3', '2']);
  });

  it('ordena por género (los sin género al final) y dentro de cada uno por artista', () => {
    const withGenres = albums.map((a) => ({ ...a, genre: a.id === '2' || a.id === '3' ? 'Rock' : a.id === '1' ? 'Pop' : null }));
    expect(sortAlbums(withGenres, 'genero').map((a) => a.id)).toEqual(['1', '3', '2', '4']);
  });

  it('ordena por país (los sin país al final) y dentro de cada uno por artista', () => {
    const withCountries = albums.map((a) => ({ ...a, country: a.id === '2' || a.id === '3' ? 'AR' : a.id === '1' ? 'GB' : null }));
    expect(sortAlbums(withCountries, 'pais').map((a) => a.id)).toEqual(['3', '2', '1', '4']);
  });

  it('ordena por recientes', () => {
    expect(sortAlbums(albums, 'recientes').map((a) => a.id)).toEqual(['4', '1', '3', '2']);
  });

  it('ordena por color, con los grises al final', () => {
    expect(sortAlbums(albums, 'color').map((a) => a.id).slice(0, 2)).toEqual(['2', '1']);
  });
});

describe('parseCollection', () => {
  it('acepta el formato exportado y una lista pelada', () => {
    expect(parseCollection({ version: 1, discos: albums })).toHaveLength(4);
    expect(parseCollection(albums)).toHaveLength(4);
  });

  it('rechaza cualquier otra cosa', () => {
    expect(parseCollection({ foo: 1 })).toBeNull();
    expect(parseCollection([{ id: 1 }])).toBeNull();
  });
});
