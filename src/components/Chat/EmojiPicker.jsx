import { useState } from 'react';
import { EMOJI_CATEGORIES } from './emojiData';

export function EmojiPicker({
  onSelect,
  specialMode = false,
  backMode = false,
  visible = false,
  className = '',
}) {
  const [activeId, setActiveId] = useState(EMOJI_CATEGORIES[0]?.id || 'smileys');
  const activeCategory = EMOJI_CATEGORIES.find((c) => c.id === activeId) || EMOJI_CATEGORIES[0];

  return (
    <div
      className={[
        'emoji-picker',
        visible ? 'emoji-picker--visible emoji-picker--open' : 'emoji-picker--closing',
        specialMode ? 'emoji-picker--special' : '',
        backMode ? 'emoji-picker--back' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-visible={visible ? 'true' : 'false'}
      role="dialog"
      aria-label="Выбор эмодзи"
      aria-hidden={!visible}
    >
      <div className="emoji-picker__tabs" role="tablist" aria-label="Категории эмодзи">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={cat.id === activeId}
            aria-label={cat.label}
            title={cat.label}
            className={`emoji-picker__tab ${cat.id === activeId ? 'emoji-picker__tab--active' : ''}`}
            onClick={() => setActiveId(cat.id)}
            tabIndex={visible ? 0 : -1}
          >
            <span className="emoji-picker__tab-icon" aria-hidden="true">
              {cat.icon}
            </span>
          </button>
        ))}
      </div>
          <div className="emoji-picker__grid" role="listbox" aria-label={activeCategory?.label}>
        {activeCategory?.emojis.map((emoji) => (
          <button
            key={`${activeCategory.id}-${emoji}`}
            type="button"
            role="option"
            aria-selected="false"
            className="emoji-picker__emoji"
            onClick={() => onSelect?.(emoji)}
            aria-label={emoji}
            tabIndex={visible ? 0 : -1}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
