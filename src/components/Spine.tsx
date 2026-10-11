import type { CSSProperties } from 'react';
import { EDGE_FRACTION } from '../lib/colors';
import type { Album, ScannedSpine } from '../lib/types';

interface Props {
  album: Pick<Album, 'artist' | 'title' | 'coverUrl' | 'palette' | 'spine' | 'scan' | 'year'>;
  className?: string;
  /** Usar la imagen en alta del escaneo (para la caja en primer plano). */
  hiRes?: boolean;
}

/**
 * Lomo de caja de CD. Solo usa datos reales del disco:
 * - "arte": estira la franja izquierda de la tapa, como si el arte doblara hacia el lomo.
 * - "color": el color de fondo que Spotify calcula para ese disco.
 * - "escaneo": el lomo real de una edición en CD, escaneado (Cover Art Archive).
 */
export function Spine({ album, className = '', hiRes = false }: Props) {
  const style = album.spine === 'escaneo' && album.scan ? undefined : generatedStyle(album);

  if (album.spine === 'escaneo' && album.scan) {
    return (
      <div className={`spine spine--escaneo ${className}`} aria-hidden="true">
        <ScanStrip scan={album.scan} hiRes={hiRes} />
        <span className="spine__cap spine__cap--top" />
        <span className="spine__cap spine__cap--bottom" />
      </div>
    );
  }

  const kind = album.spine === 'color' ? 'color' : 'arte';
  return (
    <div className={`spine spine--${kind} ${className}`} style={style} aria-hidden="true">
      <span className="spine__cap spine__cap--top" />
      <span className="spine__label">
        {album.artist && <span className="spine__artist">{album.artist}</span>}
        <span className="spine__title">{album.title}</span>
        {album.year && <span className="spine__year">{album.year}</span>}
      </span>
      <span className="spine__cap spine__cap--bottom" />
    </div>
  );
}

function generatedStyle(album: Props['album']): CSSProperties {
  const arte = album.spine !== 'color';
  return {
    '--spine-bg': arte ? album.palette.edge : album.palette.base,
    '--spine-fg': arte ? album.palette.edgeText : album.palette.text,
    '--spine-art': arte ? `url("${album.coverUrl}")` : 'none',
    '--spine-art-size': `${100 / EDGE_FRACTION}% 100%`,
  } as CSSProperties;
}

/**
 * Muestra el recorte del escaneo a la altura del lomo, sin deformarlo: el ancho sale de la
 * proporción del recorte y lo que sobra a los costados queda como plástico de la caja.
 */
export function ScanStrip({ scan, hiRes = false }: { scan: ScannedSpine; hiRes?: boolean }) {
  const { crop, aspect, rotate } = scan;
  const stripRatio = (crop.w / crop.h) * aspect;
  const box: CSSProperties = {
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    left: `${(-crop.x / crop.w) * 100}%`,
    top: `${(-crop.y / crop.h) * 100}%`,
  };
  return (
    <div className="scan-strip" style={{ '--strip-ratio': stripRatio } as CSSProperties}>
      <div className="scan-strip__box" style={box}>
        <img className={`scan-img scan-img--r${rotate}`} src={hiRes ? scan.image : scan.thumb} alt="" draggable={false} loading="lazy" />
      </div>
    </div>
  );
}
