import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PrimaryButton } from '../auth';

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
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Подтверждение email</h2>
      <p className="auth-helper">
        Код отправлен на {email}
      </p>
      {debugCode && (
        <p className="auth-helper auth-helper--compact">
          Dev-режим (SMTP не настроен): код — <strong>{debugCode}</strong>
        </p>
      )}
      <AuthInput
        id="register-code"
        label="Код из письма"
        type="text"
        inputMode="numeric"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        required
        maxLength={6}
        pattern="\d{6}"
        autoFocus
        autoComplete="one-time-code"
        error={error || undefined}
      />
      <PrimaryButton
        loading={loading}
        loadingText="Проверка..."
        disabled={code.length !== 6}
      >
        Далее
      </PrimaryButton>
    </form>
  );
}
