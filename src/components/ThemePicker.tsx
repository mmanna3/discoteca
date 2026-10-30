import { TEMAS, type Tema } from '../lib/themes';

interface Props {
  value: Tema;
  onChange: (tema: Tema) => void;
}

/** Una miniatura del mueble por tema: la pared de fondo y el marco de madera con dos estantes. */
export function ThemePicker({ value, onChange }: Props) {
  return (
    <div className="themes" role="radiogroup" aria-label="Colores">
      {TEMAS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          className={`theme${value === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="theme__wall" style={{ background: t.wall }}>
            <span
              className="theme__cabinet"
              style={{ background: `linear-gradient(90deg, ${t.wood}, ${t.woodHi} 50%, ${t.wood})` }}
            >
              <span className="theme__shelf" />
              <span className="theme__shelf" />
            </span>
          </span>
          <span className="theme__label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
