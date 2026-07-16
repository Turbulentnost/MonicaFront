import '../../styles/auth.css';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__bg" aria-hidden="true">
        <span className="auth-shell__glow auth-shell__glow--left" />
        <span className="auth-shell__glow auth-shell__glow--right" />
        <span className="auth-shell__vignette" />
        <span className="auth-shell__noise" />
      </div>
      <div className="auth-shell__content">{children}</div>
    </div>
  );
}
