import { describe, expect, it } from 'vitest';
import { cleanTitle, normalize, primaryArtist, sameText, yearOf } from './text';

describe('cleanTitle', () => {
  it.each([
    ['Abbey Road (Remastered 2009)', 'Abbey Road'],
    ['Nevermind (Remastered)', 'Nevermind'],
    ['Canción Animal (Remasterizado 2007)', 'Canción Animal'],
    ['Rumours - Super Deluxe', 'Rumours'],
    ['OK Computer OKNOTOK 1997 2017', 'OK Computer OKNOTOK 1997 2017'],
    ['Sgt. Pepper (Live at the Hollywood Bowl)', 'Sgt. Pepper (Live at the Hollywood Bowl)'],
    ['Blonde [Deluxe Edition]', 'Blonde'],
    ['(What\'s the Story) Morning Glory? (Remastered)', '(What\'s the Story) Morning Glory?'],
  ])('%s → %s', (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });
});

describe('normalize / sameText', () => {
  it('ignora tildes, puntuación, "&" y el "The" inicial', () => {
    expect(sameText('Charly García', 'charly garcia')).toBe(true);
    expect(sameText('Simon & Garfunkel', 'Simon and Garfunkel')).toBe(true);
    expect(sameText('The Beatles', 'Beatles')).toBe(true);
    expect(normalize('AC/DC')).toBe('ac dc');
  });
});

it('primaryArtist toma el primero de la lista de Spotify', () => {
  expect(primaryArtist('Daft Punk, Pharrell Williams')).toBe('Daft Punk');
});

it('yearOf', () => {
  expect(yearOf('1969-09-26')).toBe(1969);
  expect(yearOf('1990')).toBe(1990);
  expect(yearOf(null)).toBeNull();
});
