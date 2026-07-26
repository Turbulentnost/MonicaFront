import { useMemo, useState } from 'react';
import { STICKER_ANIMATIONS } from '../../data/stickerPacks';
import { StickerView } from './StickerView';
import {
  addStickerToCustomPack,
  createCustomStickerPack,
  deleteCustomStickerPack,
  fileToDataUrl,
  getInstalledStickerPackIds,
  getStickerCatalog,
  installStickerPack,
  removeStickerFromCustomPack,
  uninstallStickerPack,
} from '../../utils/stickerLibrary';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'static', label: 'Обычные' },
  { id: 'animated', label: 'Анимированные' },
];

export function StickerStorePage({ onClose, onLibraryChange }) {
  const [installedIds, setInstalledIds] = useState(() => getInstalledStickerPackIds());
  const [catalogTick, setCatalogTick] = useState(0);
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [packForm, setPackForm] = useState({
    title: '',
    description: '',
    kind: 'static',
    cover: '',
  });
  const [stickerForms, setStickerForms] = useState({});
  const [error, setError] = useState('');

  const catalog = useMemo(() => getStickerCatalog(), [catalogTick]);

  const packs = useMemo(() => {
    return catalog
      .filter((pack) => filter === 'all' || pack.kind === filter)
      .map((pack) => ({
        ...pack,
        installed: installedIds.includes(pack.id),
      }));
  }, [catalog, filter, installedIds]);

  const refreshLibrary = (nextInstalled) => {
    if (nextInstalled) {
      setInstalledIds(nextInstalled);
      onLibraryChange?.(nextInstalled);
    } else {
      const ids = getInstalledStickerPackIds();
      setInstalledIds(ids);
      onLibraryChange?.(ids);
    }
    setCatalogTick((value) => value + 1);
  };

  const togglePack = (packId, installed) => {
    const next = installed
      ? uninstallStickerPack(packId)
      : installStickerPack(packId);
    refreshLibrary(next);
  };

  const handleCreatePack = (event) => {
    event.preventDefault();
    setError('');
    const title = packForm.title.trim();
    if (!title) {
      setError('Укажите название пака');
      return;
    }
    const pack = createCustomStickerPack({
      title,
      description: packForm.description.trim(),
      kind: packForm.kind,
      cover: packForm.cover.trim(),
    });
    if (!pack) {
      setError('Не удалось создать пак');
      return;
    }
    setPackForm({ title: '', description: '', kind: 'static', cover: '' });
    setCreateOpen(false);
    refreshLibrary();
  };

  const updateStickerForm = (packId, patch) => {
    setStickerForms((prev) => ({
      ...prev,
      [packId]: {
        emoji: '',
        label: '',
        animation: 'bounce',
        ...(prev[packId] || {}),
        ...patch,
      },
    }));
  };

  const handleAddEmojiSticker = (pack) => {
    setError('');
    const form = stickerForms[pack.id] || {};
    const emoji = String(form.emoji || '').trim();
    if (!emoji) {
      setError('Введите эмодзи для стикера');
      return;
    }
    const next = addStickerToCustomPack(pack.id, {
      type: pack.kind === 'animated' ? 'animated' : 'emoji',
      emoji,
      label: String(form.label || '').trim() || emoji,
      animation: pack.kind === 'animated' ? (form.animation || 'bounce') : null,
    });
    if (!next) {
      setError('Не удалось добавить стикер');
      return;
    }
    updateStickerForm(pack.id, { emoji: '', label: '' });
    refreshLibrary();
  };

  const handleAddImageSticker = async (pack, file) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Нужен файл изображения (png, webp, gif)');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 1.5 МБ для локальных стикеров)');
      return;
    }
    try {
      const src = await fileToDataUrl(file);
      const next = addStickerToCustomPack(pack.id, {
        type: 'image',
        src,
        emoji: pack.kind === 'animated' ? '✨' : '🖼️',
        label: file.name.replace(/\.[^.]+$/, '') || 'Стикер',
        animation: pack.kind === 'animated' ? 'pulse' : null,
      });
      if (!next) {
        setError('Не удалось добавить файл');
        return;
      }
      refreshLibrary();
    } catch {
      setError('Не удалось прочитать файл');
    }
  };

  const handleDeletePack = (packId) => {
    const next = deleteCustomStickerPack(packId);
    refreshLibrary(next);
  };

  return (
    <main className="sticker-store">
      <header className="sticker-store__header">
        <div>
          <h1>Магазин стикеров</h1>
          <p>Обычные и анимированные наборы, плюс свои паки</p>
        </div>
        <div className="sticker-store__header-actions">
          <button
            type="button"
            className="sticker-store__secondary"
            onClick={() => setCreateOpen((open) => !open)}
          >
            {createOpen ? 'Скрыть форму' : 'Создать пак'}
          </button>
          <button type="button" className="sticker-store__close" onClick={onClose}>
            Назад в чат
          </button>
        </div>
      </header>

      <div className="sticker-store__filters" role="tablist" aria-label="Фильтр стикеров">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`sticker-store__filter${filter === item.id ? ' is-active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {createOpen && (
        <form className="sticker-store__create" onSubmit={handleCreatePack}>
          <h2>Новый пак</h2>
          <div className="sticker-store__create-grid">
            <label>
              <span>Название</span>
              <input
                value={packForm.title}
                onChange={(event) => setPackForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Например: Мои реакции"
                maxLength={40}
              />
            </label>
            <label>
              <span>Тип</span>
              <select
                value={packForm.kind}
                onChange={(event) => setPackForm((prev) => ({ ...prev, kind: event.target.value }))}
              >
                <option value="static">Обычный</option>
                <option value="animated">Анимированный</option>
              </select>
            </label>
            <label>
              <span>Обложка (эмодзи)</span>
              <input
                value={packForm.cover}
                onChange={(event) => setPackForm((prev) => ({ ...prev, cover: event.target.value }))}
                placeholder="🧩"
                maxLength={8}
              />
            </label>
            <label className="sticker-store__create-wide">
              <span>Описание</span>
              <input
                value={packForm.description}
                onChange={(event) => setPackForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Коротко о наборе"
                maxLength={80}
              />
            </label>
          </div>
          <button type="submit" className="sticker-store__action">
            Создать пак
          </button>
        </form>
      )}

      {error ? <p className="sticker-store__error" role="alert">{error}</p> : null}

      <div className="sticker-store__grid">
        {packs.map((pack) => {
          const form = stickerForms[pack.id] || {
            emoji: '',
            label: '',
            animation: 'bounce',
          };

          return (
            <article
              key={pack.id}
              className={`sticker-store__card${pack.kind === 'animated' ? ' is-animated' : ''}`}
            >
              <div className="sticker-store__cover" aria-hidden="true">
                <StickerView
                  sticker={{
                    type: pack.kind === 'animated' ? 'animated' : 'emoji',
                    emoji: pack.cover,
                    animation: pack.kind === 'animated' ? 'pulse' : null,
                    label: pack.title,
                  }}
                  size="lg"
                />
              </div>
              <div className="sticker-store__body">
                <div className="sticker-store__title-row">
                  <h2>{pack.title}</h2>
                  <span className={`sticker-store__badge sticker-store__badge--${pack.kind}`}>
                    {pack.kind === 'animated' ? 'Анимация' : 'Обычный'}
                  </span>
                </div>
                <p>{pack.description || (pack.custom ? 'Свой набор' : 'Набор из каталога')}</p>
                <div className="sticker-store__preview">
                  {pack.stickers.length ? (
                    pack.stickers.map((sticker) => (
                      <span key={sticker.id} className="sticker-store__preview-item">
                        <StickerView sticker={sticker} size="sm" />
                        {pack.custom ? (
                          <button
                            type="button"
                            className="sticker-store__remove-sticker"
                            title="Удалить стикер"
                            aria-label={`Удалить ${sticker.label}`}
                            onClick={() => {
                              removeStickerFromCustomPack(pack.id, sticker.id);
                              refreshLibrary();
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    ))
                  ) : (
                    <span className="sticker-store__preview-empty">Пока нет стикеров</span>
                  )}
                </div>

                <div className="sticker-store__card-actions">
                  <button
                    type="button"
                    className={`sticker-store__action${pack.installed ? ' is-installed' : ''}`}
                    onClick={() => togglePack(pack.id, pack.installed)}
                  >
                    {pack.installed ? 'Удалить из пикера' : 'Добавить'}
                  </button>
                  {pack.custom ? (
                    <button
                      type="button"
                      className="sticker-store__danger"
                      onClick={() => handleDeletePack(pack.id)}
                    >
                      Удалить пак
                    </button>
                  ) : null}
                </div>

                {pack.custom ? (
                  <div className="sticker-store__add-sticker">
                    <h3>Добавить стикер</h3>
                    <div className="sticker-store__add-row">
                      <input
                        value={form.emoji}
                        onChange={(event) => updateStickerForm(pack.id, { emoji: event.target.value })}
                        placeholder="Эмодзи"
                        maxLength={8}
                      />
                      <input
                        value={form.label}
                        onChange={(event) => updateStickerForm(pack.id, { label: event.target.value })}
                        placeholder="Подпись"
                        maxLength={24}
                      />
                      {pack.kind === 'animated' ? (
                        <select
                          value={form.animation}
                          onChange={(event) => updateStickerForm(pack.id, { animation: event.target.value })}
                        >
                          {STICKER_ANIMATIONS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      ) : null}
                      <button type="button" onClick={() => handleAddEmojiSticker(pack)}>
                        + Эмодзи
                      </button>
                    </div>
                    <label className="sticker-store__file">
                      <span>+ Файл (png / webp / gif)</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/gif,image/jpeg"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          handleAddImageSticker(pack, file);
                        }}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {!packs.length ? (
        <p className="sticker-store__empty">В этом разделе пока нет наборов</p>
      ) : null}
    </main>
  );
}
