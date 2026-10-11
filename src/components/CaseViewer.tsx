import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { formatDuration, formatTotal } from '../lib/format';
import { spotifyAppUrl, spotifyWebUrl } from '../lib/spotify';
import type { Album } from '../lib/types';
import { Spine } from './Spine';

interface Props {
  album: Album;
  position: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRemove: () => void;
  onToggleSpine: () => void;
}

/** Medidas reales de una caja de CD: 142 × 125 × 10 mm. */
function caseSize() {
  const w = Math.min(440, window.innerWidth * 0.8, ((window.innerHeight * 0.5) * 142) / 125);
  return { w, h: (w * 125) / 142, d: Math.max(14, (w * 10) / 142) };
}

type Pose = 'entering' | 'front' | 'back';

export function CaseViewer({ album, position, onClose, onPrev, onNext, onRemove, onToggleSpine }: Props) {
  const [size, setSize] = useState(caseSize);
  const [pose, setPose] = useState<Pose>('entering');
  const [dragX, setDragX] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  // Cada disco nuevo entra mostrando el lomo y gira hasta la tapa.
  useEffect(() => {
    setPose('entering');
    setConfirming(false);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setPose('front')));
    return () => cancelAnimationFrame(frame);
  }, [album.id]);

  useEffect(() => {
    const onResize = () => setSize(caseSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setPose((p) => (p === 'back' ? 'front' : 'back'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const flip = () => setPose((p) => (p === 'back' ? 'front' : 'back'));

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (drag.current?.id === e.pointerId) setDragX(e.clientX - drag.current.x);
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = drag.current;
    drag.current = null;
    setDragX(0);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onNext : onPrev)();
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) flip();
  };

  const totalMs = album.tracks.reduce((sum, t) => sum + t.durationMs, 0);
  const dense = album.tracks.length > 14;
  const showTrackArtist = album.tracks.some((t) => t.artist && t.artist !== album.artist);

  const style = {
    '--cw': `${size.w}px`,
    '--ch': `${size.h}px`,
    '--cd': `${size.d}px`,
    '--drag': `${dragX}px`,
    '--insert-bg': album.palette.base,
    '--insert-fg': album.palette.text,
  } as CSSProperties;

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`${album.artist} — ${album.title}`} style={style}>
      <div className="viewer__backdrop" onClick={onClose} />
      <button type="button" className="viewer__close" onClick={onClose} aria-label="Guardar el disco">
        ×
      </button>

      <div
        className="viewer__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragX(0);
        }}
      >
        <div className={`jewel jewel--${pose}${dragX ? ' jewel--dragging' : ''}`}>
          <div className="jewel__face jewel__front">
            <div className="jewel__hinge" />
            <img className="jewel__cover" src={album.coverUrl} alt="" draggable={false} />
            <div className="jewel__gloss" />
          </div>

          <div className={`jewel__face jewel__back${dense ? ' jewel__back--dense' : ''}`}>
            <div className="tray">
              <Spine album={album} className="tray__spine tray__spine--left" />
              <div className="tray__body">
                <div className="tray__heading">
                  {album.artist && <span className="tray__artist">{album.artist}</span>}
                  <span className="tray__title">{album.title}</span>
                </div>
                {album.tracks.length > 0 ? (
                  <ol className="tray__tracks">
                    {album.tracks.map((t, i) => (
                      <li key={i}>
                        <span className="tray__n">{i + 1}</span>
                        <span className="tray__t">
                          {t.title}
                          {showTrackArtist && t.artist && <em> — {t.artist}</em>}
                        </span>
                        <span className="tray__d">{formatDuration(t.durationMs)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="tray__none">Spotify no informó la lista de temas.</p>
                )}
                {totalMs > 0 && (
                  <div className="tray__total">
                    {album.tracks.length} temas · {formatTotal(totalMs)}
                  </div>
                )}
              </div>
              <Spine album={album} className="tray__spine tray__spine--right" />
            </div>
            <div className="jewel__gloss" />
          </div>

          <div className="jewel__face jewel__spine">
            <Spine album={album} />
          </div>
          <div className="jewel__face jewel__side" />
          <div className="jewel__face jewel__top" />
          <div className="jewel__face jewel__bottom" />
        </div>
        <div className="viewer__shadow" />
      </div>

      <div className="viewer__info">
        <div className="viewer__artist">{album.artist}</div>
        <div className="viewer__title">{album.title}</div>
      </div>

      <div className="viewer__controls">
        <button type="button" className="round" onClick={onPrev} aria-label="Disco anterior">
          ‹
        </button>
        <a className="play" href={spotifyAppUrl(album.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
          Abrir en Spotify
        </a>
        <button type="button" className="round" onClick={onNext} aria-label="Disco siguiente">
          ›
        </button>
      </div>

      <div className="viewer__secondary">
        <span className="viewer__position">{position}</span>
        <button type="button" onClick={flip}>
          {pose === 'back' ? 'Ver tapa' : 'Ver contratapa'}
        </button>
        <button type="button" onClick={onToggleSpine}>
          Lomo: {album.spine === 'arte' ? 'arte de tapa' : 'color'}
        </button>
        <a href={spotifyWebUrl(album.id)} target="_blank" rel="noreferrer">
          Abrir en la web
        </a>
        {confirming ? (
          <span className="viewer__confirm">
            ¿Sacarlo de la discoteca?
            <button type="button" className="danger" onClick={onRemove}>
              Sí, sacar
            </button>
            <button type="button" onClick={() => setConfirming(false)}>
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}>
            Sacar de la discoteca
          </button>
        )}
      </div>
    </div>
  );
}
