import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../auth';

export default function AvatarStep({ registrationToken }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { completeAuth } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const finish = async (withAvatar) => {
    setError('');
    setLoading(true);
    try {
      if (withAvatar && photo) {
        await authApi.registerAvatar(registrationToken, photo);
      }
      const { data } = await authApi.registerComplete(registrationToken);
      completeAuth(data);
      navigate('/chats');
    } catch (err) {
      setError(
        err.response?.data?.registration_token?.[0] ||
          err.response?.data?.detail ||
          'Ошибка завершения регистрации'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-body">
      <h2 className="auth-title">Фото профиля</h2>
      <p className="auth-helper">Загрузите аватар или пропустите этот шаг</p>

      <div className="auth-avatar-upload">
        {preview ? (
          <img src={preview} alt="Предпросмотр аватара" className="auth-avatar-preview" />
        ) : (
          <div className="auth-avatar-placeholder">Нет фото</div>
        )}
        <input
          type="file"
          accept="image/*"
          className="auth-file-input"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="auth-form-error" role="alert">
          {error}
        </p>
      )}

      <div className="auth-button-row">
        <button
          type="button"
          className="auth-secondary-btn"
          onClick={() => finish(false)}
          disabled={loading}
        >
          Пропустить
        </button>
        <PrimaryButton
          type="button"
          loading={loading}
          loadingText="Завершение..."
          disabled={!photo}
          onClick={() => finish(true)}
        >
          Завершить
        </PrimaryButton>
      </div>
    </div>
  );
}
