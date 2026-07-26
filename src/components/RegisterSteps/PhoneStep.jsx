import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PrimaryButton } from '../auth';

export default function PhoneStep({ phone, setPhone, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.registerPhone(phone);
      if (data.phone) setPhone(data.phone);
      onNext({
        debugCode: data.debug_code || '',
        telegramUrl: data.telegram_url || '',
        botUsername: data.bot_username || '',
      });
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.detail;
      setError(
        data?.phone?.[0]
        || (Array.isArray(detail) ? detail[0] : detail)
        || 'Не удалось начать подтверждение'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Регистрация</h2>
      <p className="auth-helper">
        Введите номер телефона — подтвердим его
        <br />
        через Telegram-бота и пришлём код.
      </p>
      <AuthInput
        id="register-phone"
        label="Телефон"
        icon="phone"
        type="tel"
        name="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+7 900 123-45-67"
        autoComplete="tel"
        required
        autoFocus
        error={error || undefined}
      />
      <PrimaryButton loading={loading} loadingText="Далее...">
        Далее
      </PrimaryButton>
    </form>
  );
}
