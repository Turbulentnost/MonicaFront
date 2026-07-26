import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PrimaryButton } from '../auth';

export default function EmailStep({ email, setEmail, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.registerEmail(email);
      onNext(data.debug_code || '');
    } catch (err) {
      setError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Регистрация</h2>
      <p className="auth-helper">
        Введите email, и мы отправим вам
        <br />
        код подтверждения.
      </p>
      <AuthInput
        id="register-email"
        label="Email"
        icon="mail"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        autoComplete="email"
        required
        autoFocus
        error={error || undefined}
      />
      <PrimaryButton loading={loading} loadingText="Отправка...">
        Далее
      </PrimaryButton>
    </form>
  );
}
