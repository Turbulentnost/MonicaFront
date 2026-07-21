import { useEffect, useRef, useState } from 'react';
import { authApi } from '../api/client';
import { UserAvatar } from './Chat/UserAvatar';

function getErrorMessage(error) {
  const data = error.response?.data;
  if (!data) return error.message || 'Не удалось сохранить изменения';
  if (typeof data.detail === 'string') return data.detail;
  const first = Object.values(data).flat()[0];
  return typeof first === 'string' ? first : 'Не удалось сохранить изменения';
}

export function AccountSettings({ user, onUserUpdated, onClose }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    city: '',
    birth_date: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const photoInputRef = useRef(null);

  useEffect(() => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      city: user?.city || '',
      birth_date: user?.birth_date || '',
    });
  }, [user]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Файл больше 10 МБ');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
    setSaved(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const profileResponse = await authApi.updateProfile({
        ...form,
        birth_date: form.birth_date || null,
      });
      let updatedUser = profileResponse.data;
      if (photoFile) {
        const avatarResponse = await authApi.updateAvatar(photoFile);
        updatedUser = avatarResponse.data;
      }
      onUserUpdated(updatedUser);
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
      if (photoInputRef.current) photoInputRef.current.value = '';
      setSaved(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="account-settings">
      <header className="account-settings__header">
        <div>
          <h1>Настройки аккаунта</h1>
          <p>Фото и личные данные профиля</p>
        </div>
        <button type="button" className="account-settings__close" onClick={onClose}>
          Вернуться к чатам
        </button>
      </header>

      <form className="account-settings__card" onSubmit={handleSubmit}>
        <section className="account-settings__avatar-section">
          <button
            type="button"
            className="account-settings__avatar-button"
            onClick={() => photoInputRef.current?.click()}
            aria-label="Изменить фотографию"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Новая фотография" />
            ) : (
              <UserAvatar user={user} size={104} />
            )}
            <span className="account-settings__avatar-overlay">Изменить</span>
          </button>
          <div>
            <h2>@{user?.nickname}</h2>
            <p>{user?.email}</p>
            <button
              type="button"
              className="account-settings__photo-link"
              onClick={() => photoInputRef.current?.click()}
            >
              Выбрать фотографию
            </button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhotoChange}
            hidden
          />
        </section>

        <div className="account-settings__divider" />

        <div className="account-settings__fields">
          <label>
            <span>Имя</span>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </label>
          <label>
            <span>Фамилия</span>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </label>
          <label>
            <span>Город</span>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              maxLength={100}
              placeholder="Не указан"
            />
          </label>
          <label>
            <span>Дата рождения</span>
            <input
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleChange}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
        </div>

        {error && <div className="account-settings__message error">{error}</div>}
        {saved && <div className="account-settings__message success">Изменения сохранены</div>}

        <div className="account-settings__actions">
          <button type="button" className="account-settings__cancel" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="account-settings__save" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </main>
  );
}
