/**
 * El nombre de la discoteca en la URL: `#/mana`. Minúsculas, números y guiones, de 2 a 24
 * caracteres, sin guion al principio ni al final. La misma regla está en firestore.rules.
 */
export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$/;

export const isValidHandle = (handle: string) => HANDLE_PATTERN.test(handle);

/** Lo que escribís en el campo, ya convertido: "Matías Pérez" → "matias-perez". */
export function toHandle(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 24);
}

/** Saca `#/mana` de la URL. `null` = la portada. */
export function handleFromHash(hash: string): string | null {
  const handle = decodeURIComponent(hash.replace(/^#\/?/, '')).split('/')[0].toLowerCase();
  return handle || null;
}
