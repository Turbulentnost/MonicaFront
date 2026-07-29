import { useEffect, useRef } from 'react';
import { CHAT_THEMES } from '../themes/chatThemes';

function ThemePreviewCard({ theme, selected, onSelect }) {
  const { preview } = theme;
  return (
    <button
      type="button"
      className={`theme-picker__card${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(theme.id)}
      aria-pressed={selected}
      aria-label={`${theme.name}. ${theme.tag}`}
      style={{
        '--tp-bg': preview.bg,
        '--tp-surface': preview.surface,
        '--tp-accent': preview.accent,
        '--tp-bubble': preview.bubble,
        '--tp-text': preview.text,
      }}
    >
      <div className="theme-picker__mock" aria-hidden="true">
        <div className="theme-picker__mock-rail" />
        <div className="theme-picker__mock-side">
          <span />
          <span />
          <span />
        </div>
        <div className="theme-picker__mock-main">
          <div className="theme-picker__mock-header" />
          <div
            className="theme-picker__mock-bubble theme-picker__mock-bubble--other"
            style={{ background: preview.surface }}
          />
          <div
            className="theme-picker__mock-bubble theme-picker__mock-bubble--own"
            style={{ background: preview.bubble }}
          />
          <div
            className="theme-picker__mock-input"
            style={{ background: preview.accent, opacity: 0.55 }}
          />
        </div>
      </div>
      <div className="theme-picker__meta">
        <div className="theme-picker__title-row">
          <strong>{theme.name}</strong>
          <span className="theme-picker__tag">{theme.tag}</span>
        </div>
        <p>{theme.description}</p>
        <div className="theme-picker__swatches" aria-hidden="true">
          <i style={{ background: preview.bg }} />
          <i style={{ background: preview.surface }} />
          <i style={{ background: preview.accent }} />
          <i style={{ background: preview.bubble }} />
        </div>
      </div>
    </button>
  );
}

export function ThemePicker({ themeId, onThemeChange }) {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector('.theme-picker__card.is-selected');
    if (!active) return;
    const left = active.offsetLeft - (track.clientWidth - active.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [themeId]);

  const scrollByCard = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('.theme-picker__card');
    const step = (card?.offsetWidth || 260) + 14;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="theme-picker" aria-label="Тема оформления">
      <div className="theme-picker__head">
        <div>
          <h2>Тема интерфейса</h2>
          <p>Листайте карточки и выберите стиль — применяется сразу</p>
        </div>
        <div className="theme-picker__controls">
          <button
            type="button"
            className="theme-picker__chevron"
            onClick={() => scrollByCard(-1)}
            aria-label="Предыдущие темы"
          >
            ‹
          </button>
          <button
            type="button"
            className="theme-picker__chevron"
            onClick={() => scrollByCard(1)}
            aria-label="Следующие темы"
          >
            ›
          </button>
        </div>
      </div>

      <div className="theme-picker__viewport">
        <div ref={trackRef} className="theme-picker__track" role="listbox" aria-label="Доступные темы">
          {CHAT_THEMES.map((theme) => (
            <ThemePreviewCard
              key={theme.id}
              theme={theme}
              selected={theme.id === themeId}
              onSelect={onThemeChange}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
