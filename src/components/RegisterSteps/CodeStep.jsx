import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PrimaryButton } from '../auth';

export default function CodeStep({
  phone,
  onNext,
  setRegistrationToken,
  debugCode,
  telegramUrl,
  botUsername,
  onRefreshLink,
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefresh = async () => {
    if (!onRefreshLink) return;
    setError('');
    setRefreshing(true);
    try {
      await onRefreshLink();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.phone?.[0] || data?.detail || 'Не удалось обновить ссылку');
    } finally {
      setRefreshing(false);
    }
  };

  const phoneLabel = phone?.startsWith('+') ? phone : (phone ? `+${phone}` : '');

  return (
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Подтверждение номера</h2>
      <p className="auth-helper">
        Откройте Telegram, подтвердите номер {phoneLabel || ''}
        <br />
        кнопкой в боте — он сразу пришлёт код.
      </p>

      {telegramUrl ? (
        <a
          className="auth-primary-link"
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Перейти в Telegram{botUsername ? ` (@${botUsername})` : ''}
        </a>
      ) : null}

      {debugCode && (
        <p className="auth-helper auth-helper--compact">
          Dev-режим (бот не настроен): код — <strong>{debugCode}</strong>
        </p>
      )}

      <AuthInput
        id="register-code"
        label="Код из Telegram"
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

      {onRefreshLink && (
        <button
          type="button"
          className="auth-text-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Обновление...' : 'Получить новую ссылку'}
        </button>
      )}
    </form>
  );
}
