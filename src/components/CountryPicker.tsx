import { useEffect, useState, type FormEvent } from 'react';
import { ALL_COUNTRIES, countryCode, countryName } from '../sources/countries';
import type { Album } from '../lib/types';

interface Props {
  album: Album;
  /** Países ya usados en la discoteca: aparecen como atajos. */
  knownCountries: string[];
  onUpdate: (patch: Partial<Album>) => void;
  onClose: () => void;
}

export function CountryPicker({ album, knownCountries, onUpdate, onClose }: Props) {
  const [text, setText] = useState('');
  const typed = countryCode(text);
  const shortcuts = [...new Set(knownCountries)]
    .map((code) => ({ code, name: countryName(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const choose = (country: string | null) => {
    onUpdate({ country, countrySource: 'manual', countryFetchedAt: Date.now() });
    onClose();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (typed) choose(typed);
  };

  const current = countryName(album.country);

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="country-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card" onSubmit={onSubmit}>
        <h2 id="country-title">País</h2>
        <p className="dialog__hint">
          {current
            ? `Ahora: ${current} (${album.countrySource === 'manual' ? 'elegido por vos' : 'según MusicBrainz, el país del artista'}).`
            : 'Este disco todavía no tiene país.'}
        </p>
        {shortcuts.length > 0 && (
          <div className="genre-chips">
            {shortcuts.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`genre-chip${c.code === album.country ? ' is-active' : ''}`}
                onClick={() => choose(c.code)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="dialog__row genre-custom">
          <input
            list="countries"
            placeholder="Buscar país…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus={shortcuts.length === 0}
          />
          <datalist id="countries">
            {ALL_COUNTRIES.map((c) => (
              <option key={c.code} value={c.name} />
            ))}
          </datalist>
          <button type="submit" className="btn" disabled={!typed}>
            Usar
          </button>
        </div>
        <div className="dialog__actions">
          {album.country && (
            <button type="button" className="btn btn--ghost" onClick={() => choose(null)}>
              Quitar país
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
