// Agrupa los géneros que informan MusicBrainz e iTunes en familias amplias, como los
// separadores de una disquería. Si un género no encaja en ninguna familia, no se adivina.

export const GENRE_FAMILIES = [
  'Rock',
  'Pop',
  'Rap / Hip hop',
  'Cantautor',
  'Electrónica',
  'Jazz',
  'Blues',
  'Soul / R&B / Funk',
  'Reggae / Ska',
  'Cumbia / Tropical',
  'Reggaetón',
  'Folklore / Folk',
  'Tango',
  'Clásica',
] as const;

type Family = (typeof GENRE_FAMILIES)[number];

// El orden importa: gana la primera regla que coincide ("trip hop" es electrónica y no rap,
// "pop rock" es rock y no pop).
const RULES: [Family, RegExp][] = [
  ['Electrónica', /trip[ -]?hop|electr[oó]nic|house|techno|ambient|idm|edm|\bdance\b|downtempo|synth|drum and bass|dubstep/],
  ['Rap / Hip hop', /hip[ -]?hop|\brap\b|\btrap\b|drill|grime|boom bap/],
  ['Cantautor', /singer[ -/]songwriter|cantautor|trova|nueva canci[oó]n/],
  ['Reggaetón', /regga?et[oó]n|dembow|urbano latino|latin urban/],
  ['Cumbia / Tropical', /cumbia|tropical|salsa|merengue|bachata|cuarteto/],
  ['Reggae / Ska', /reggae|\bska\b|\bdub\b|dancehall/],
  ['Soul / R&B / Funk', /\bsoul\b|r&b|\brnb\b|rhythm and blues|\bfunk|motown|gospel/],
  ['Blues', /blues/],
  ['Jazz', /jazz|bossa|swing|bebop/],
  ['Tango', /tango/],
  ['Folklore / Folk', /folk|chacarera|zamba|chamam[eé]|andin|ranchera|bolero/],
  ['Clásica', /classical|cl[aá]sica|orchestral|baroque|opera|symphon/],
  ['Rock', /rock|punk|grunge|metal|alternativ|indie|shoegaze|garage|psychedel|new wave|emo/],
  ['Pop', /\bpop\b/],
];

export function genreFamily(raw: string): Family | null {
  const text = raw.toLowerCase();
  return RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

/** Primera familia reconocible en una lista de géneros ordenada de más a menos votada. */
export function firstFamily(raws: string[]): Family | null {
  for (const raw of raws) {
    const family = genreFamily(raw);
    if (family) return family;
  }
  return null;
}
