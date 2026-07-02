import { useState } from 'react';
import { authApi } from '../../api/client';

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
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Ваш профиль</h2>
      <p className="hint">У вас 5 минут на заполнение данных</p>
      <label>
        Имя *
        <input name="first_name" value={form.first_name} onChange={handleChange} required />
      </label>
      <label>
        Фамилия *
        <input name="last_name" value={form.last_name} onChange={handleChange} required />
      </label>
      <label>
        Никнейм *
        <input name="nickname" value={form.nickname} onChange={handleChange} required />
      </label>
      <label>
        Пароль *
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
        />
      </label>
      <label>
        Город
        <input name="city" value={form.city} onChange={handleChange} />
      </label>
      <label>
        Дата рождения
        <input name="birth_date" type="date" value={form.birth_date} onChange={handleChange} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Сохранение...' : 'Далее'}
      </button>
    </form>
  );
}
