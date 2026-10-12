// Países por código ISO 3166-1 alfa-2 (el que usa MusicBrainz), con nombres en español
// que da el propio navegador (Intl.DisplayNames).

const names = new Intl.DisplayNames(['es'], { type: 'region' });

/** "AR" → "Argentina". Si el código no es un país conocido, null. */
export function countryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  try {
    const name = names.of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
}

/** Todos los países que el navegador sabe nombrar, ordenados por nombre. */
export const ALL_COUNTRIES: { code: string; name: string }[] = (() => {
  const list: { code: string; name: string }[] = [];
  const A = 'A'.charCodeAt(0);
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      // Códigos de uso privado / reservados que algunos navegadores igual nombran.
      if (/^(AA|Q[M-Z]|X[A-Z]|ZZ|EU|EZ|UN)$/.test(code)) continue;
      const name = countryName(code);
      if (name) list.push({ code, name });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
})();

/** "argentina" → "AR". Compara sin tildes ni mayúsculas. */
export function countryCode(name: string): string | null {
  const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return ALL_COUNTRIES.find((c) => key(c.name) === key(name))?.code ?? null;
}
