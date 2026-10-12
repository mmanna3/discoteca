import { useEffect, useRef, useState, type FormEvent } from 'react';
import { analyzeCover, parseRgb, readableTextOn } from '../lib/colors';
import { fetchCountry, fetchGenre, fetchMetadata } from '../lib/metadata';
import { countryName } from '../sources/countries';
import { lookupAlbum } from '../lib/spotify';
import type { Album } from '../lib/types';
import { Spine } from './Spine';

interface Props {
  initialValue: string;
  existingIds: Set<string>;
  onSave: (album: Album) => void;
  onShow: (id: string) => void;
  onClose: () => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; album: Album; artistMissing: boolean; metaDone?: boolean };

async function buildAlbum(input: string): Promise<State> {
  const result = await lookupAlbum(input);
  if (!result.ok) return { kind: 'error', message: result.error };

  const { album, artistMissing } = result;
  const cover = await analyzeCover(album.coverUrl);
  const base = album.colors?.background ?? cover?.average ?? 'rgb(40, 40, 40)';
  const baseRgb = parseRgb(base);
  return {
    kind: 'preview',
    artistMissing,
    album: {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl,
      tracks: album.tracks,
      palette: {
        base,
        text: baseRgb ? readableTextOn(baseRgb) : '#fbf7ef',
        edge: cover?.edge ?? base,
        edgeText: cover?.edgeText ?? '#fbf7ef',
      },
      spine: 'arte',
      addedAt: Date.now(),
    },
  };
}

export function AddDisc({ initialValue, existingIds, onSave, onShow, onClose }: Props) {
  const [value, setValue] = useState(initialValue);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);

  const search = async (input: string) => {
    if (!input.trim()) return;
    const id = ++request.current;
    setState({ kind: 'loading' });
    const next = await buildAlbum(input);
    if (id !== request.current) return;
    setState(next);
    if (next.kind !== 'preview') return;

    // Año y sello llegan después (MusicBrainz es lento): completamos la vista previa al vuelo.
    const meta = await fetchMetadata(next.album);
    if (id !== request.current) return;
    // Sin artista, una búsqueda fallida puede salir bien cuando lo escriban: que la reintente el backfill.
    const usable = meta && (meta.metaSource || !next.artistMissing) ? meta : {};
    setState((s) =>
      s.kind === 'preview' && s.album.id === next.album.id
        ? { ...s, metaDone: true, album: { ...s.album, ...usable } }
        : s,
    );

    if (next.artistMissing) return;
    const withGroup = { ...next.album, releaseGroupId: meta?.releaseGroupId ?? null };
    const genre = await fetchGenre(withGroup);
    if (id !== request.current) return;
    if (genre) setState((s) => (s.kind === 'preview' && s.album.id === next.album.id ? { ...s, album: { ...s.album, ...genre } } : s));

    const country = await fetchCountry(withGroup);
    if (!country || id !== request.current) return;
    setState((s) => (s.kind === 'preview' && s.album.id === next.album.id ? { ...s, album: { ...s.album, ...country } } : s));
  };

  useEffect(() => {
    if (initialValue) void search(initialValue);
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (state.kind === 'preview') {
      if (!state.album.artist.trim()) return;
      onSave({ ...state.album, artist: state.album.artist.trim() });
    } else {
      void search(value);
    }
  };

  const preview = state.kind === 'preview' ? state : null;
  const duplicate = preview && existingIds.has(preview.album.id);

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card" onSubmit={onSubmit}>
        <h2 id="add-title">Guardar un disco</h2>
        <p className="dialog__hint">
          En Spotify, abrí el álbum → <b>Compartir</b> → <b>Copiar link del álbum</b>, y pegalo acá.
        </p>
        <div className="dialog__row">
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            placeholder="https://open.spotify.com/album/…"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state.kind !== 'loading') setState({ kind: 'idle' });
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text) {
                e.preventDefault();
                setValue(text);
                void search(text);
              }
            }}
          />
          {!preview && (
            <button type="submit" className="btn" disabled={state.kind === 'loading' || !value.trim()}>
              {state.kind === 'loading' ? 'Buscando…' : 'Buscar'}
            </button>
          )}
        </div>

        {state.kind === 'error' && <p className="dialog__error">{state.message}</p>}

        {state.kind === 'loading' && (
          <div className="dialog__loading" aria-live="polite">
            <span className="disc-spinner" /> Buscando en Spotify…
          </div>
        )}

        {preview && (
          <div className="dialog__preview">
            <Spine album={preview.album} className="dialog__spine" />
            <img src={preview.album.coverUrl} alt="" className="dialog__cover" />
            <div className="dialog__meta">
              {preview.artistMissing ? (
                <label className="dialog__artist-input">
                  <span>Spotify no me dio el artista. ¿De quién es?</span>
                  <input
                    autoFocus
                    value={preview.album.artist}
                    onChange={(e) => setState({ ...preview, album: { ...preview.album, artist: e.target.value } })}
                  />
                </label>
              ) : (
                <div className="dialog__artist">{preview.album.artist}</div>
              )}
              <div className="dialog__title">{preview.album.title}</div>
              <div className="dialog__tracks">
                {[
                  preview.album.year,
                  preview.album.label,
                  preview.album.genre,
                  countryName(preview.album.country),
                  preview.album.tracks.length > 0 && `${preview.album.tracks.length} temas`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {!preview.metaDone && <span className="dialog__pending"> · buscando año…</span>}
              </div>
            </div>
          </div>
        )}

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          {preview &&
            (duplicate ? (
              <button type="button" className="btn" onClick={() => onShow(preview.album.id)}>
                Ya lo tenés: verlo
              </button>
            ) : (
              <button type="submit" className="btn" disabled={!preview.album.artist.trim()}>
                Guardar en la discoteca
              </button>
            ))}
        </div>
      </form>
    </div>
  );
}
