import { useState } from 'react';
import { authApi } from '../../api/client';

export default function CodeStep({ email, onNext, setRegistrationToken, debugCode }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.verifyCode(email, code);
      setRegistrationToken(data.registration_token);
      onNext();
    } catch (err) {
      setError(err.response?.data?.code?.[0] || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Подтверждение email</h2>
      <p className="hint">Код отправлен на {email}</p>
      {debugCode && (
        <p className="hint">
          Dev-режим (SMTP не настроен): код — <strong>{debugCode}</strong>
        </p>
      )}
      <label>
        Код из письма
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          maxLength={6}
          pattern="\d{6}"
          autoFocus
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading || code.length !== 6}>
        {loading ? 'Проверка...' : 'Далее'}
      </button>
    </form>
  );
}
