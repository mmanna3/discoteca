import { describe, expect, it } from 'vitest';
import { handleFromHash, isValidHandle, toHandle } from './handles';

describe('handles', () => {
  it('acepta minúsculas, números y guiones en el medio', () => {
    expect(isValidHandle('mana')).toBe(true);
    expect(isValidHandle('la-discoteca-1')).toBe(true);
    expect(isValidHandle('m')).toBe(false);
    expect(isValidHandle('-mana')).toBe(false);
    expect(isValidHandle('mana-')).toBe(false);
    expect(isValidHandle('Mana')).toBe(false);
    expect(isValidHandle('a'.repeat(25))).toBe(false);
  });

  it('convierte lo que escribís en un nombre válido', () => {
    expect(toHandle('Matías Pérez')).toBe('matias-perez');
    expect(toHandle('  ¡Ñandú!  ')).toBe('nandu-');
    expect(toHandle('a'.repeat(30))).toHaveLength(24);
  });

  it('lee el nombre de la URL', () => {
    expect(handleFromHash('')).toBe(null);
    expect(handleFromHash('#/')).toBe(null);
    expect(handleFromHash('#/mana')).toBe('mana');
    expect(handleFromHash('#/Mana/algo')).toBe('mana');
  });
});
