import { useEffect, useRef, useState } from 'react';
import { EMOJI_CATEGORIES } from './emojiData';
import { StickerView } from './StickerView';
import { Twemoji } from './Twemoji';
import { getInstalledStickerPacks } from '../../utils/stickerLibrary';

export function EmojiPicker({
  onSelect,
  onStickerSelect,
  onOpenStore,
  specialMode = false,
  backMode = false,
  visible = false,
  className = '',
  installedPackIds = null,
  emojiOnly = false,
}) {
  const [panel, setPanel] = useState('emoji'); // emoji | stickers
  const [activeId, setActiveId] = useState(EMOJI_CATEGORIES[0]?.id || 'smileys');
  const [packs, setPacks] = useState(() => getInstalledStickerPacks());
  const [activePackId, setActivePackId] = useState(() => getInstalledStickerPacks()[0]?.id || '');
  const [scrollEdge, setScrollEdge] = useState({ top: false, bottom: true });
  const [scrolling, setScrolling] = useState(false);
  const gridRef = useRef(null);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    if (emojiOnly) {
      setPanel('emoji');
      return;
    }
    const next = getInstalledStickerPacks();
    setPacks(next);
    setActivePackId((current) => (
      next.some((pack) => pack.id === current) ? current : (next[0]?.id || '')
    ));
  }, [visible, installedPackIds, emojiOnly]);

  const updateScrollEdges = () => {
    const node = gridRef.current;
    if (!node) return;
    const top = node.scrollTop > 2;
    const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 2;
    setScrollEdge({ top, bottom });
  };

  useEffect(() => {
    if (!visible || panel !== 'emoji') return undefined;
    const node = gridRef.current;
    if (!node) return undefined;
    updateScrollEdges();
    const onScroll = () => {
      updateScrollEdges();
      setScrolling(true);
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => setScrolling(false), 180);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollEdges);
    return () => {
      node.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollEdges);
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    };
  }, [visible, panel, activeId]);

  const activeCategory = EMOJI_CATEGORIES.find((c) => c.id === activeId) || EMOJI_CATEGORIES[0];
  const activePack = packs.find((pack) => pack.id === activePackId) || packs[0] || null;
  const showStickers = !emojiOnly && panel === 'stickers';

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
      aria-label={emojiOnly ? 'Выбор эмодзи' : 'Выбор эмодзи и стикеров'}
      aria-hidden={!visible}
    >
      {!emojiOnly && (
        <div className="emoji-picker__modes" role="tablist" aria-label="Раздел">
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'emoji'}
            className={`emoji-picker__mode${panel === 'emoji' ? ' is-active' : ''}`}
            onClick={() => setPanel('emoji')}
            tabIndex={visible ? 0 : -1}
          >
            Эмодзи
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'stickers'}
            className={`emoji-picker__mode${panel === 'stickers' ? ' is-active' : ''}`}
            onClick={() => setPanel('stickers')}
            tabIndex={visible ? 0 : -1}
          >
            Стикеры
          </button>
          <button
            type="button"
            className="emoji-picker__store-btn"
            onClick={() => onOpenStore?.()}
            title="Магазин стикеров"
            aria-label="Открыть магазин стикеров"
            tabIndex={visible ? 0 : -1}
          >
            Магазин
          </button>
        </div>
      )}

      {!showStickers ? (
        <>
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
                  <Twemoji emoji={cat.icon} />
                </span>
              </button>
            ))}
          </div>
          <div
            className={[
              'emoji-picker__grid-wrap',
              scrollEdge.top ? 'has-top-fade' : '',
              scrollEdge.bottom ? 'has-bottom-fade' : '',
              scrolling ? 'is-scrolling' : '',
            ].filter(Boolean).join(' ')}
          >
            <div
              ref={gridRef}
              className="emoji-picker__grid"
              role="listbox"
              aria-label={activeCategory?.label}
            >
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
                  <Twemoji emoji={emoji} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="emoji-picker__tabs" role="tablist" aria-label="Наборы стикеров">
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                role="tab"
                aria-selected={pack.id === activePack?.id}
                aria-label={pack.title}
                title={`${pack.title}${pack.kind === 'animated' ? ' · анимация' : ''}`}
                className={`emoji-picker__tab ${pack.id === activePack?.id ? 'emoji-picker__tab--active' : ''}`}
                onClick={() => setActivePackId(pack.id)}
                tabIndex={visible ? 0 : -1}
              >
                <span className="emoji-picker__tab-icon" aria-hidden="true">
                  <Twemoji emoji={pack.cover} />
                </span>
              </button>
            ))}
            <button
              type="button"
              className="emoji-picker__tab emoji-picker__tab--add"
              onClick={() => onOpenStore?.()}
              title="Добавить стикеры"
              aria-label="Добавить стикеры из магазина"
              tabIndex={visible ? 0 : -1}
            >
              <span className="emoji-picker__tab-icon" aria-hidden="true">＋</span>
            </button>
          </div>
          {activePack ? (
            <div className="emoji-picker__stickers" role="listbox" aria-label={activePack.title}>
              {activePack.stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  role="option"
                  className={`emoji-picker__sticker${sticker.type === 'animated' ? ' is-animated' : ''}`}
                  onClick={() => onStickerSelect?.(sticker)}
                  aria-label={sticker.label}
                  tabIndex={visible ? 0 : -1}
                >
                  <StickerView sticker={sticker} size="picker" />
                </button>
              ))}
            </div>
          ) : (
            <div className="emoji-picker__empty">
              <p>Нет установленных наборов</p>
              <button type="button" onClick={() => onOpenStore?.()}>
                Открыть магазин
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
