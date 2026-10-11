import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { SpineScan } from '../sources/musicbrainz';
import { fetchSpineScans } from '../lib/metadata';
import type { Album, ScannedSpine } from '../lib/types';
import { Spine } from './Spine';

interface Props {
  album: Album;
  onUpdate: (patch: Partial<Album>) => void;
  onClose: () => void;
}

export function SpinePicker({ album, onUpdate, onClose }: Props) {
  const [scans, setScans] = useState<SpineScan[] | 'loading' | 'error' | null>(null);
  const [editing, setEditing] = useState<{ scan: SpineScan; initial?: ScannedSpine } | null>(null);

  useEffect(() => {
    if (!album.releaseGroupId) return;
    let cancelled = false;
    setScans('loading');
    void fetchSpineScans(album.releaseGroupId).then((result) => {
      if (!cancelled) setScans(result ?? 'error');
    });
    return () => {
      cancelled = true;
    };
  }, [album.releaseGroupId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      if (editing) setEditing(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editing, onClose]);

  const choose = (patch: Partial<Album>) => {
    onUpdate(patch);
    onClose();
  };

  const currentScan = album.scan;

  return (
    <div className="dialog picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <div className="dialog__card picker__card">
        <div className="picker__head">
          <h2 id="picker-title">{editing ? 'Marcá dónde está el lomo' : 'Elegir lomo'}</h2>
          <button type="button" className="picker__x" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {editing ? (
          <CropEditor
            album={album}
            scan={editing.scan}
            initial={editing.initial}
            onBack={() => setEditing(null)}
            onSave={(scan) => choose({ spine: 'escaneo', scan })}
          />
        ) : (
          <>
            <div className="picker__options">
              <SpineOption label="Arte de tapa" active={album.spine === 'arte'} onClick={() => choose({ spine: 'arte' })}>
                <Spine album={{ ...album, spine: 'arte' }} />
              </SpineOption>
              <SpineOption label="Color" active={album.spine === 'color'} onClick={() => choose({ spine: 'color' })}>
                <Spine album={{ ...album, spine: 'color' }} />
              </SpineOption>
              {currentScan && (
                <SpineOption
                  label="Escaneo elegido"
                  active={album.spine === 'escaneo'}
                  onClick={() => choose({ spine: 'escaneo' })}
                  extra={
                    <button
                      type="button"
                      className="picker__link"
                      onClick={() =>
                        setEditing({
                          initial: currentScan,
                          scan: {
                            releaseId: currentScan.release.id,
                            image: currentScan.image,
                            thumb: currentScan.thumb,
                            types: [],
                            country: currentScan.release.country,
                            date: currentScan.release.date,
                            format: currentScan.release.format,
                            label: currentScan.release.label,
                            catalogNumber: currentScan.release.catalogNumber,
                          },
                        })
                      }
                    >
                      Ajustar recorte
                    </button>
                  }
                >
                  <Spine album={{ ...album, spine: 'escaneo' }} />
                </SpineOption>
              )}
            </div>

            <h3 className="picker__subtitle">Lomos reales escaneados</h3>
            <ScanList album={album} scans={scans} onPick={(scan) => setEditing({ scan })} />
          </>
        )}
      </div>
    </div>
  );
}

function SpineOption({
  label,
  active,
  onClick,
  children,
  extra,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className={`picker__option${active ? ' is-active' : ''}`}>
      <button type="button" className="picker__option-btn" onClick={onClick} aria-pressed={active}>
        <span className="picker__option-spine">{children}</span>
        <span>{label}</span>
      </button>
      {extra}
    </div>
  );
}

function scanCaption(s: Pick<SpineScan, 'country' | 'date' | 'format'>) {
  return [s.country === 'XE' ? 'Europa' : s.country === 'XW' ? 'Mundial' : s.country, s.date?.slice(0, 4), s.format]
    .filter(Boolean)
    .join(' · ');
}

function ScanList({
  album,
  scans,
  onPick,
}: {
  album: Album;
  scans: SpineScan[] | 'loading' | 'error' | null;
  onPick: (scan: SpineScan) => void;
}) {
  if (!album.releaseGroupId) {
    return (
      <p className="picker__note">
        {album.metaFetchedAt === undefined
          ? 'Todavía estoy buscando este disco en MusicBrainz. Probá de nuevo en unos segundos.'
          : 'No encontré este disco en MusicBrainz, así que no tengo escaneos de sus ediciones.'}
      </p>
    );
  }
  if (scans === 'loading' || scans === null) {
    return (
      <div className="picker__note picker__loading">
        <span className="disc-spinner" /> Revisando los escaneos de cada edición en Cover Art Archive… puede tardar
        unos segundos.
      </div>
    );
  }
  if (scans === 'error') return <p className="picker__note">No pude consultar Cover Art Archive. Probá más tarde.</p>;
  if (scans.length === 0) {
    return <p className="picker__note">Nadie subió todavía un escaneo del lomo de este disco a Cover Art Archive.</p>;
  }
  return (
    <>
      <p className="picker__note">
        De ediciones físicas reales, subidos a Cover Art Archive. Elegí uno y marcá el lomo dentro de la imagen.
      </p>
      <div className="picker__grid">
        {scans.map((s, i) => (
          <button key={`${s.releaseId}-${i}`} type="button" className="picker__scan" onClick={() => onPick(s)}>
            <img src={s.thumb} alt="" loading="lazy" />
            <span className="picker__scan-caption">
              <b>{scanCaption(s) || 'Edición sin datos'}</b>
              {[s.label, s.catalogNumber].filter(Boolean).join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

type Crop = ScannedSpine['crop'];
type Rotation = ScannedSpine['rotate'];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Primera aproximación: tiras largas → lomo entero (rotado si es horizontal); contratapas → franja izquierda. */
function defaultFraming(naturalAspect: number): { rotate: Rotation; crop: Crop } {
  if (naturalAspect > 3) return { rotate: 90, crop: { x: 0, y: 0, w: 1, h: 1 } };
  if (naturalAspect < 1 / 3) return { rotate: 0, crop: { x: 0, y: 0, w: 1, h: 1 } };
  return { rotate: 0, crop: { x: 0.005, y: 0.01, w: 0.06, h: 0.98 } };
}

type DragMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: DragMode[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const MIN_W = 0.01;
const MIN_H = 0.04;

function CropEditor({
  album,
  scan,
  initial,
  onBack,
  onSave,
}: {
  album: Album;
  scan: SpineScan;
  initial?: ScannedSpine;
  onBack: () => void;
  onSave: (scan: ScannedSpine) => void;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [rotate, setRotate] = useState<Rotation>(initial?.rotate ?? 0);
  const [crop, setCrop] = useState<Crop | null>(initial?.crop ?? null);
  const [maxBox, setMaxBox] = useState({ w: 520, h: 420 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; x: number; y: number; start: Crop; id: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setMaxBox({ w: entry.contentRect.width, h: Math.min(440, window.innerHeight * 0.5) }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onLoad = (img: HTMLImageElement) => {
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    setNatural(n);
    if (!initial) {
      const framing = defaultFraming(n.w / n.h);
      setRotate(framing.rotate);
      setCrop(framing.crop);
    }
  };

  const turned = rotate === 90 || rotate === 270;
  const aspect = natural ? (turned ? natural.h / natural.w : natural.w / natural.h) : 1;
  const boxW = Math.min(maxBox.w, maxBox.h * aspect);
  const boxH = boxW / aspect;

  const rotateBy = (delta: 90 | -90) => {
    const next = (((rotate + delta) % 360) + 360) % 360 as Rotation;
    setRotate(next);
    const nextAspect = natural ? (next % 180 ? natural.h / natural.w : natural.w / natural.h) : 1;
    setCrop(nextAspect < 1 / 3 ? { x: 0, y: 0, w: 1, h: 1 } : { x: 0.005, y: 0.01, w: 0.06, h: 0.98 });
  };

  const onPointerDown = (mode: DragMode) => (e: ReactPointerEvent) => {
    if (!crop) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: crop, id: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.x) / boxW;
    const dy = (e.clientY - d.y) / boxH;
    const s = d.start;
    if (d.mode === 'move') {
      setCrop({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    let { x, y, w, h } = s;
    if (d.mode.includes('w')) {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN_W);
      w = s.w + (s.x - nx);
      x = nx;
    }
    if (d.mode.includes('e')) w = clamp(s.w + dx, MIN_W, 1 - s.x);
    if (d.mode.includes('n')) {
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN_H);
      h = s.h + (s.y - ny);
      y = ny;
    }
    if (d.mode.includes('s')) h = clamp(s.h + dy, MIN_H, 1 - s.y);
    setCrop({ x, y, w, h });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const pending: ScannedSpine | null =
    natural && crop
      ? {
          image: scan.image,
          thumb: scan.thumb,
          aspect,
          rotate,
          crop,
          release: {
            id: scan.releaseId,
            country: scan.country,
            date: scan.date,
            format: scan.format,
            label: scan.label,
            catalogNumber: scan.catalogNumber,
          },
        }
      : null;

  const imgStyle: CSSProperties = turned
    ? { width: boxH, height: boxW, left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${rotate}deg)` }
    : { width: boxW, height: boxH, left: 0, top: 0, transform: rotate === 180 ? 'rotate(180deg)' : undefined };

  return (
    <div className="crop">
      <div className="crop__main" ref={wrapRef}>
        <div
          className="crop__stage"
          style={{ width: boxW, height: boxH, visibility: natural ? 'visible' : 'hidden' }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            className="crop__img"
            src={scan.image}
            alt=""
            draggable={false}
            style={imgStyle}
            onLoad={(e) => onLoad(e.currentTarget)}
          />
          {crop && (
            <div
              className="crop__rect"
              style={{ left: crop.x * boxW, top: crop.y * boxH, width: crop.w * boxW, height: crop.h * boxH }}
              onPointerDown={onPointerDown('move')}
            >
              {HANDLES.map((h) => (
                <span key={h} className={`crop__handle crop__handle--${h}`} onPointerDown={onPointerDown(h)} />
              ))}
            </div>
          )}
        </div>
        {!natural && (
          <div className="picker__note picker__loading">
            <span className="disc-spinner" /> Cargando escaneo…
          </div>
        )}
        <div className="crop__tools">
          <button type="button" className="btn btn--ghost" onClick={() => rotateBy(-90)}>
            ↺ Rotar
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => rotateBy(90)}>
            Rotar ↻
          </button>
        </div>
      </div>

      <aside className="crop__side">
        <div className="crop__preview">
          {pending && <Spine album={{ ...album, spine: 'escaneo', scan: pending }} hiRes />}
        </div>
        <p className="picker__note">
          Arrastrá el rectángulo y sus bordes hasta encerrar el lomo. Rotá la imagen para que quede vertical.
        </p>
        <p className="crop__edition">{[scanCaption(scan), scan.label, scan.catalogNumber].filter(Boolean).join(' · ')}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Volver
          </button>
          <button type="button" className="btn" disabled={!pending} onClick={() => pending && onSave(pending)}>
            Usar este lomo
          </button>
        </div>
      </aside>
    </div>
  );
}
