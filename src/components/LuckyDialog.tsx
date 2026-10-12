import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { countryName } from '../sources/countries';
import { matchesLucky, NO_FILTERS, type LuckyFilters } from '../lib/lucky';
import type { Album } from '../lib/types';

interface Props {
  albums: Album[];
  initial: LuckyFilters;
  onSpin: (pool: Album[], filters: LuckyFilters) => void;
  onClose: () => void;
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const parseYear = (text: string) => {
  const n = Number(text);
  return text.trim() && Number.isInteger(n) ? n : null;
};

/** "Toca toca, la suerte es loca": elegís entre qué discos sortear y la ruleta hace el resto. */
export function LuckyDialog({ albums, initial, onSpin, onClose }: Props) {
  const [yearFrom, setYearFrom] = useState(initial.yearFrom?.toString() ?? '');
  const [yearTo, setYearTo] = useState(initial.yearTo?.toString() ?? '');
  const [countries, setCountries] = useState(initial.countries);
  const [genres, setGenres] = useState(initial.genres);

  // Solo se ofrecen los valores que existen en la discoteca. Si un filtro guardado ya no
  // existe (p. ej. sacaste el único disco de ese país), se ignora.
  const options = useMemo(() => {
    const years = albums.map((a) => a.year).filter((y): y is number => y != null);
    const countryCodes = [...new Set(albums.map((a) => a.country).filter((c): c is string => !!c))];
    return {
      minYear: years.length ? Math.min(...years) : null,
      maxYear: years.length ? Math.max(...years) : null,
      countries: countryCodes
        .map((code) => ({ code, name: countryName(code) ?? code }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      genres: [...new Set(albums.map((a) => a.genre).filter((g): g is string => !!g))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    };
  }, [albums]);

  const filters: LuckyFilters = {
    yearFrom: parseYear(yearFrom),
    yearTo: parseYear(yearTo),
    countries: countries.filter((c) => options.countries.some((o) => o.code === c)),
    genres: genres.filter((g) => options.genres.includes(g)),
  };
  const pool = albums.filter((a) => matchesLucky(a, filters));
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pool.length) onSpin(pool, filters);
  };

  const clear = () => {
    setYearFrom('');
    setYearTo('');
    setCountries([]);
    setGenres([]);
  };

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="lucky-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card lucky" onSubmit={onSubmit}>
        <h2 id="lucky-title">Toca toca, la suerte es loca</h2>
        <p className="dialog__hint">Elegí entre qué discos sortear. Lo que dejes vacío vale cualquiera.</p>

        <fieldset className="lucky__group">
          <legend>Año</legend>
          <div className="lucky__years">
            <label>
              Desde
              <input
                type="number"
                inputMode="numeric"
                placeholder={options.minYear?.toString() ?? ''}
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="number"
                inputMode="numeric"
                placeholder={options.maxYear?.toString() ?? ''}
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        {options.countries.length > 0 && (
          <fieldset className="lucky__group">
            <legend>País</legend>
            <div className="genre-chips">
              {options.countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  aria-pressed={countries.includes(c.code)}
                  className={`genre-chip${countries.includes(c.code) ? ' is-active' : ''}`}
                  onClick={() => setCountries((list) => toggle(list, c.code))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {options.genres.length > 0 && (
          <fieldset className="lucky__group">
            <legend>Género</legend>
            <div className="genre-chips">
              {options.genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={genres.includes(g)}
                  className={`genre-chip${genres.includes(g) ? ' is-active' : ''}`}
                  onClick={() => setGenres((list) => toggle(list, g))}
                >
                  {g}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="lucky__footer">
          <span className={`lucky__count${pool.length ? '' : ' is-empty'}`} aria-live="polite">
            {pool.length === 0
              ? 'Ningún disco cumple estos filtros'
              : pool.length === albums.length
                ? `Entre los ${albums.length} discos`
                : `Entre ${pool.length} de ${albums.length} discos`}
          </span>
          <div className="dialog__actions">
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={clear}>
                Limpiar
              </button>
            )}
            <button type="submit" className="btn btn--luck" disabled={pool.length === 0}>
              ¡Que toque!
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
