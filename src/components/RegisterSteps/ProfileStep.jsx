import { useState } from 'react';
import { authApi } from '../../api/client';
import { AuthInput, PasswordInput, PrimaryButton } from '../auth';

export default function ProfileStep({ registrationToken, onNext }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    password: '',
    nickname: '',
    city: '',
    birth_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        registration_token: registrationToken,
        ...form,
        birth_date: form.birth_date || null,
      };
      await authApi.registerProfile(payload);
      onNext();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.nickname?.[0] ||
        data?.password?.[0] ||
        data?.registration_token?.[0] ||
        'Ошибка сохранения профиля';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form-body" noValidate>
      <h2 className="auth-title">Ваш профиль</h2>
      <p className="auth-helper">У вас 5 минут на заполнение данных</p>

      <AuthInput
        id="profile-first-name"
        label="Имя *"
        name="first_name"
        value={form.first_name}
        onChange={handleChange}
        required
        autoComplete="given-name"
      />
      <AuthInput
        id="profile-last-name"
        label="Фамилия *"
        name="last_name"
        value={form.last_name}
        onChange={handleChange}
        required
        autoComplete="family-name"
      />
      <AuthInput
        id="profile-nickname"
        label="Никнейм *"
        name="nickname"
        value={form.nickname}
        onChange={handleChange}
        required
        autoComplete="username"
      />
      <PasswordInput
        id="profile-password"
        name="password"
        value={form.password}
        onChange={handleChange}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Минимум 8 символов"
      />
      <AuthInput
        id="profile-city"
        label="Город"
        name="city"
        value={form.city}
        onChange={handleChange}
        autoComplete="address-level2"
      />
      <AuthInput
        id="profile-birth-date"
        label="Дата рождения"
        name="birth_date"
        type="date"
        value={form.birth_date}
        onChange={handleChange}
      />

      {error && (
        <p className="auth-form-error" role="alert">
          {error}
        </p>
      )}

      <PrimaryButton loading={loading} loadingText="Сохранение...">
        Далее
      </PrimaryButton>
    </form>
  );
}
