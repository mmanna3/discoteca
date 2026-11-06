import { useMemo, useState } from 'react';
import { hasFilters, type AlbumFilters, NO_FILTERS } from '../lib/filters';
import type { Album } from '../lib/types';
import { countryName } from '../sources/countries';

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="search-icon" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface FieldProps {
  query: string;
  advancedActive: boolean;
  advancedOpen: boolean;
  onQuery: (query: string) => void;
  onToggleAdvanced: () => void;
  onClose: () => void;
}

/** El campo que reemplaza a la lupa: busca mientras escribís y da acceso a la búsqueda avanzada. */
export function SearchField({ query, advancedActive, advancedOpen, onQuery, onToggleAdvanced, onClose }: FieldProps) {
  return (
    <div className="search" role="search">
      <SearchIcon />
      <input
        type="text"
        autoFocus
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Disco o artista"
        aria-label="Buscar por disco o artista"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <button
        type="button"
        className={`search__btn${advancedActive ? ' is-active' : ''}`}
        aria-label="Búsqueda avanzada"
        title="Búsqueda avanzada"
        aria-expanded={advancedOpen}
        onClick={onToggleAdvanced}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h9M18 7h2M4 17h2M11 17h9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="15.5" cy="7" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="17" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button type="button" className="search__btn" aria-label="Cerrar búsqueda" title="Cerrar búsqueda" onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const parseYear = (text: string) => {
  const n = Number(text);
  return text.trim() && Number.isInteger(n) ? n : null;
};

interface AdvancedProps {
  albums: Album[];
  filters: AlbumFilters;
  onChange: (filters: AlbumFilters) => void;
}

/** Búsqueda avanzada: año, país y género. Solo se ofrecen los valores que existen en la discoteca. */
export function AdvancedSearch({ albums, filters, onChange }: AdvancedProps) {
  const [yearFrom, setYearFrom] = useState(filters.yearFrom?.toString() ?? '');
  const [yearTo, setYearTo] = useState(filters.yearTo?.toString() ?? '');

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

  const clear = () => {
    setYearFrom('');
    setYearTo('');
    onChange(NO_FILTERS);
  };

  return (
    <section className="advanced" aria-label="Búsqueda avanzada">
      <fieldset className="advanced__group">
        <legend>Año</legend>
        <div className="advanced__years">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Desde"
            placeholder={options.minYear?.toString() ?? 'Desde'}
            value={yearFrom}
            onChange={(e) => {
              setYearFrom(e.target.value);
              onChange({ ...filters, yearFrom: parseYear(e.target.value) });
            }}
          />
          <span aria-hidden="true">a</span>
          <input
            type="number"
            inputMode="numeric"
            aria-label="Hasta"
            placeholder={options.maxYear?.toString() ?? 'Hasta'}
            value={yearTo}
            onChange={(e) => {
              setYearTo(e.target.value);
              onChange({ ...filters, yearTo: parseYear(e.target.value) });
            }}
          />
        </div>
      </fieldset>

      {options.countries.length > 0 && (
        <fieldset className="advanced__group">
          <legend>País</legend>
          <div className="genre-chips">
            {options.countries.map((c) => (
              <button
                key={c.code}
                type="button"
                aria-pressed={filters.countries.includes(c.code)}
                className={`genre-chip${filters.countries.includes(c.code) ? ' is-active' : ''}`}
                onClick={() => onChange({ ...filters, countries: toggle(filters.countries, c.code) })}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {options.genres.length > 0 && (
        <fieldset className="advanced__group">
          <legend>Género</legend>
          <div className="genre-chips">
            {options.genres.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={filters.genres.includes(g)}
                className={`genre-chip${filters.genres.includes(g) ? ' is-active' : ''}`}
                onClick={() => onChange({ ...filters, genres: toggle(filters.genres, g) })}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {hasFilters(filters) && (
        <button type="button" className="btn btn--ghost advanced__clear" onClick={clear}>
          Limpiar
        </button>
      )}
    </section>
  );
}
