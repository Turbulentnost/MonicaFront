import { useState } from 'react';
import { authApi } from '../../api/client';

export default function EmailStep({ email, setEmail, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.registerEmail(email);
      onNext();
    } catch (err) {
      setError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Регистрация</h2>
      <p className="hint">Введите email — мы отправим код подтверждения</p>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Далее'}
      </button>
    </form>
  );
}
