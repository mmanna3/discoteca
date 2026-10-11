import { describe, expect, it } from 'vitest';
import { firstFamily, genreFamily } from './genres';

describe('genreFamily', () => {
  it.each([
    ['art rock', 'Rock'],
    ['pop rock', 'Rock'],
    ['Rock y Alternativo', 'Rock'],
    ['punk', 'Rock'],
    ['heavy metal', 'Rock'],
    ['Hip-Hop/Rap', 'Rap / Hip hop'],
    ['Rap', 'Rap / Hip hop'],
    ['trip hop', 'Electrónica'],
    ['singer-songwriter', 'Cantautor'],
    ['Singer/Songwriter', 'Cantautor'],
    ['latin pop', 'Pop'],
    ['Pop Latino', 'Pop'],
    ['Urbano latino', 'Reggaetón'],
    ['cumbia villera', 'Cumbia / Tropical'],
    ['chacarera', 'Folklore / Folk'],
    ['tango', 'Tango'],
    ['jazz fusion', 'Jazz'],
  ])('%s → %s', (raw, family) => {
    expect(genreFamily(raw)).toBe(family);
  });

  it.each(['Latin', 'Latino', 'female vocals', 'Música'])('no adivina con "%s"', (raw) => {
    expect(genreFamily(raw)).toBeNull();
  });
});

it('firstFamily usa el primer género reconocible, del más votado al menos', () => {
  expect(firstFamily(['female vocals', 'singer-songwriter', 'pop rock'])).toBe('Cantautor');
  expect(firstFamily(['ambient', 'art rock'])).toBe('Electrónica');
  expect(firstFamily([])).toBeNull();
});
