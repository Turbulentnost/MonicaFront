import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 10.7a2.75 2.75 0 0 0 3.7 3.7" />
      <path d="M9.4 5.6A10.4 10.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.7 16.7 0 0 1-3.2 3.7" />
      <path d="M6.2 6.7A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.7" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const canSubmit = !loading && email.trim() && password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/chats');
    } catch (err) {
      if (!err.response) {
        setError('Сервер недоступен. Проверьте, что бэкенд запущен.');
      } else if (err.response.status === 401 || err.response.status === 400) {
        setError('Неверный email или пароль');
      } else {
        setError(`Ошибка входа (${err.response.status}). Попробуйте позже.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <img
        className="login-page__bg"
        src={`${process.env.PUBLIC_URL || ''}/login-bg.png`}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="login-page__fade" aria-hidden="true" />

      <form className="login-page__form" onSubmit={handleSubmit} noValidate>
        <div className="login-page__spacer" aria-hidden="true" />

        <div className="login-page__body">
          <div className="login-page__field">
            <label className="visually-hidden" htmlFor="login-email">
              Логин / Email
            </label>
            <input
              id="login-email"
              className="login-page__input"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Логин / Email"
              autoComplete="email"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="login-page__field">
            <label className="visually-hidden" htmlFor="login-password">
              Пароль
            </label>
            <div className="login-page__control">
              <input
                id="login-password"
                className="login-page__input login-page__input--password"
                type={passwordVisible ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-page__toggle"
                onClick={() => setPasswordVisible((v) => !v)}
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                disabled={loading}
              >
                {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-page__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-page__submit" disabled={!canSubmit}>
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <div className="login-page__footer">
            <button type="button" className="login-page__link" disabled={loading}>
              Забыли пароль?
            </button>
            <Link to="/register" className="login-page__link" tabIndex={loading ? -1 : undefined}>
              Создать аккаунт
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
