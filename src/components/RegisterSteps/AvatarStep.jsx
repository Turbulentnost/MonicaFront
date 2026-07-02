import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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
    <div className="auth-form">
      <h2>Фото профиля</h2>
      <p className="hint">Загрузите аватар или пропустите этот шаг</p>
      <div className="avatar-upload">
        {preview ? (
          <img src={preview} alt="Preview" className="avatar-preview" />
        ) : (
          <div className="avatar-placeholder">Нет фото</div>
        )}
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button type="button" onClick={() => finish(false)} disabled={loading}>
          Пропустить
        </button>
        <button type="button" onClick={() => finish(true)} disabled={loading || !photo}>
          {loading ? 'Завершение...' : 'Завершить'}
        </button>
      </div>
    </div>
  );
}
