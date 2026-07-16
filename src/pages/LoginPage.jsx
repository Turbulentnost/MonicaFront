import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AuthLayout,
  AuthCard,
  AuthBrand,
  AuthInput,
  PasswordInput,
  PrimaryButton,
  AuthLink,
  AuthFooter,
  RememberMeCheckbox,
} from '../components/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('monica_remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('monica_remember_email', email);
      } else {
        localStorage.removeItem('monica_remember_email');
      }
      navigate('/chats');
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard as="form" onSubmit={handleSubmit} noValidate>
        <AuthBrand />
        <h1 className="auth-title">Вход</h1>
        <p className="auth-helper">
          Добро пожаловать! Войдите в свой аккаунт,
          <br />
          чтобы продолжить работу.
        </p>

        <div className="auth-form-body">
          <AuthInput
            id="login-email"
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
          />
          <PasswordInput
            id="login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
            required
          />

          <div className="auth-meta-row">
            <RememberMeCheckbox checked={rememberMe} onChange={setRememberMe} />
            <button type="button" className="auth-link-accent auth-forgot">
              Забыли пароль?
            </button>
          </div>

          {error && (
            <p className="auth-form-error" role="alert">
              {error}
            </p>
          )}

          <PrimaryButton loading={loading} loadingText="Вход...">
            Войти
          </PrimaryButton>
        </div>

        <AuthFooter>
          Нет аккаунта? <AuthLink to="/register">Зарегистрироваться</AuthLink>
        </AuthFooter>
      </AuthCard>
    </AuthLayout>
  );
}
