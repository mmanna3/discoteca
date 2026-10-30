import { useEffect, useState, type FormEvent } from 'react';
import type { Tema } from '../lib/themes';
import { ThemePicker } from './ThemePicker';

interface Props {
  initial: Tema;
  /** Mientras elegís, la discoteca de atrás ya se pinta con el tema. */
  onPreview: (tema: Tema) => void;
  onSave: (tema: Tema) => void;
  onClose: () => void;
}

export function ThemeDialog({ initial, onPreview, onSave, onClose }: Props) {
  const [tema, setTema] = useState(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(tema);
  };

  return (
    <div className="dialog dialog--clear" role="dialog" aria-modal="true" aria-labelledby="theme-title">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card" onSubmit={onSubmit}>
        <h2 id="theme-title">Colores de la discoteca</h2>
        <p className="dialog__hint">El mueble y la pared. Así la ve todo el que entra.</p>
        <ThemePicker
          value={tema}
          onChange={(t) => {
            setTema(t);
            onPreview(t);
          }}
        />
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
