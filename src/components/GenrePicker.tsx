import { useEffect, useState, type FormEvent } from 'react';
import { GENRE_FAMILIES } from '../sources/genres';
import type { Album } from '../lib/types';

interface Props {
  album: Album;
  /** Géneros ya usados en la discoteca (incluye los que escribiste a mano). */
  knownGenres: string[];
  onUpdate: (patch: Partial<Album>) => void;
  onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  musicbrainz: 'según MusicBrainz',
  itunes: 'según iTunes',
  manual: 'elegido por vos',
};

export function GenrePicker({ album, knownGenres, onUpdate, onClose }: Props) {
  const [custom, setCustom] = useState('');
  const options = [...new Set([...GENRE_FAMILIES, ...knownGenres])].sort((a, b) => a.localeCompare(b, 'es'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const choose = (genre: string | null) => {
    onUpdate({ genre, genreSource: 'manual', genreFetchedAt: Date.now() });
    onClose();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const genre = custom.trim();
    if (genre) choose(genre.charAt(0).toLocaleUpperCase('es') + genre.slice(1));
  };

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="genre-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card" onSubmit={onSubmit}>
        <h2 id="genre-title">Género</h2>
        <p className="dialog__hint">
          {album.genre
            ? `Ahora: ${album.genre} (${SOURCE_LABEL[album.genreSource ?? ''] ?? 'detectado'}).`
            : 'Este disco todavía no tiene género.'}
        </p>
        <div className="genre-chips">
          {options.map((g) => (
            <button
              key={g}
              type="button"
              className={`genre-chip${g === album.genre ? ' is-active' : ''}`}
              onClick={() => choose(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="dialog__row genre-custom">
          <input placeholder="Otro género…" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button type="submit" className="btn" disabled={!custom.trim()}>
            Usar
          </button>
        </div>
        <div className="dialog__actions">
          {album.genre && (
            <button type="button" className="btn btn--ghost" onClick={() => choose(null)}>
              Quitar género
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
