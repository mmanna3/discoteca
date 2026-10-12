import { describe, expect, it } from 'vitest';
import { matchesLucky, NO_FILTERS } from './lucky';
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

describe('matchesLucky', () => {
  it('sin filtros entra todo', () => {
    expect([callejeros, kooks, sinDatos].every((a) => matchesLucky(a, NO_FILTERS))).toBe(true);
  });

  it('filtra por rango de años (inclusive) y deja afuera los sin año', () => {
    const f = { ...NO_FILTERS, yearFrom: 2000, yearTo: 2004 };
    expect(matchesLucky(callejeros, f)).toBe(true);
    expect(matchesLucky(kooks, f)).toBe(false);
    expect(matchesLucky(sinDatos, f)).toBe(false);
    expect(matchesLucky(kooks, { ...NO_FILTERS, yearFrom: 2006 })).toBe(true);
  });

  it('filtra por uno o varios países y géneros', () => {
    expect(matchesLucky(callejeros, { ...NO_FILTERS, countries: ['AR', 'UY'] })).toBe(true);
    expect(matchesLucky(kooks, { ...NO_FILTERS, countries: ['AR'] })).toBe(false);
    expect(matchesLucky(sinDatos, { ...NO_FILTERS, genres: ['Rock'] })).toBe(false);
    expect(matchesLucky(kooks, { ...NO_FILTERS, countries: ['GB'], genres: ['Rock', 'Pop'] })).toBe(true);
  });
});
