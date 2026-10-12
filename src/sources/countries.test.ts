import { describe, expect, it } from 'vitest';
import { ALL_COUNTRIES, countryCode, countryName } from './countries';

describe('countries', () => {
  it('nombra países en español', () => {
    expect(countryName('AR')).toBe('Argentina');
    expect(countryName('ES')).toBe('España');
    expect(countryName('GB')).toBe('Reino Unido');
  });

  it('ignora códigos inválidos', () => {
    expect(countryName(null)).toBeNull();
    expect(countryName('XW')).toBeNull();
    expect(countryName('argentina')).toBeNull();
  });

  it('encuentra el código por nombre, sin tildes ni mayúsculas', () => {
    expect(countryCode('argentina')).toBe('AR');
    expect(countryCode('Mexico')).toBe('MX');
    expect(countryCode('Narnia')).toBeNull();
  });

  it('la lista de países es completa y está ordenada', () => {
    expect(ALL_COUNTRIES.length).toBeGreaterThan(200);
    expect(ALL_COUNTRIES.some((c) => c.code === 'UY')).toBe(true);
  });
});
