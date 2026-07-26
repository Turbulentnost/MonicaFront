import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PrimaryButton } from '../auth';

export default function CodeStep({ phone, onNext, setRegistrationToken, debugCode }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.verifyCode(phone, code);
      setRegistrationToken(data.registration_token);
      onNext();
    } catch (err) {
      setError(err.response?.data?.code?.[0] || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const phoneLabel = phone?.startsWith('+') ? phone : (phone ? `+${phone}` : '');

  return (
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Подтверждение номера</h2>
      <p className="auth-helper">
        Код отправлен на {phoneLabel || 'ваш номер'}
      </p>
      {debugCode && (
        <p className="auth-helper auth-helper--compact">
          Dev-режим (SMSC не настроен): код — <strong>{debugCode}</strong>
        </p>
      )}
      <AuthInput
        id="register-code"
        label="Код из SMS"
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
