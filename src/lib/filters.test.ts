import { describe, expect, it } from 'vitest';
import { hasFilters, matchesFilters, matchesQuery, NO_FILTERS } from './filters';
import type { Album } from './types';

const album = (patch: Partial<Album>): Album => ({
  id: 'x',
  title: 't',
  artist: 'a',
  coverUrl: '',
  tracks: [],
  palette: { base: '', text: '', edge: '', edgeText: '' },
  spine: 'arte',
  addedAt: 0,
  ...patch,
});

const callejeros = album({ year: 2003, country: 'AR', genre: 'Rock' });
const kooks = album({ year: 2006, country: 'GB', genre: 'Rock' });
const sinDatos = album({});

describe('matchesFilters', () => {
  it('sin filtros entra todo', () => {
    expect([callejeros, kooks, sinDatos].every((a) => matchesFilters(a, NO_FILTERS))).toBe(true);
  });

  it('filtra por rango de años (inclusive) y deja afuera los sin año', () => {
    const f = { ...NO_FILTERS, yearFrom: 2000, yearTo: 2004 };
    expect(matchesFilters(callejeros, f)).toBe(true);
    expect(matchesFilters(kooks, f)).toBe(false);
    expect(matchesFilters(sinDatos, f)).toBe(false);
    expect(matchesFilters(kooks, { ...NO_FILTERS, yearFrom: 2006 })).toBe(true);
  });

  it('filtra por uno o varios países y géneros', () => {
    expect(matchesFilters(callejeros, { ...NO_FILTERS, countries: ['AR', 'UY'] })).toBe(true);
    expect(matchesFilters(kooks, { ...NO_FILTERS, countries: ['AR'] })).toBe(false);
    expect(matchesFilters(sinDatos, { ...NO_FILTERS, genres: ['Rock'] })).toBe(false);
    expect(matchesFilters(kooks, { ...NO_FILTERS, countries: ['GB'], genres: ['Rock', 'Pop'] })).toBe(true);
  });
});

describe('hasFilters', () => {
  it('detecta cualquier filtro puesto', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, yearTo: 2000 })).toBe(true);
    expect(hasFilters({ ...NO_FILTERS, genres: ['Rock'] })).toBe(true);
  });
});

describe('matchesQuery', () => {
  const disco = album({ title: 'Homogenic', artist: 'Björk' });

  it('con menos de 3 caracteres no filtra', () => {
    expect(matchesQuery(disco, '')).toBe(true);
    expect(matchesQuery(disco, 'zz')).toBe(true);
    expect(matchesQuery(disco, '  z  ')).toBe(true);
  });

  it('busca en el nombre del disco y en el del artista', () => {
    expect(matchesQuery(disco, 'genic')).toBe(true);
    expect(matchesQuery(disco, 'bjö')).toBe(true);
    expect(matchesQuery(disco, 'zzz')).toBe(false);
  });

  it('ignora mayúsculas y tildes', () => {
    expect(matchesQuery(disco, 'BJORK')).toBe(true);
    expect(matchesQuery(album({ title: 'Canción animal' }), 'cancion')).toBe(true);
  });

  it('"The" cuenta como texto', () => {
    expect(matchesQuery(album({ artist: 'The Kooks' }), 'the')).toBe(true);
    expect(matchesQuery(album({ artist: 'Callejeros' }), 'the')).toBe(false);
  });
});
