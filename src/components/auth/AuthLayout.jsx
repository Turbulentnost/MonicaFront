import '../../styles/auth.css';

const AUTH_BG = `${process.env.PUBLIC_URL || ''}/auth-bg.png`;

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <img
        className="auth-shell__photo"
        src={AUTH_BG}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="auth-shell__content">{children}</div>
    </div>
  );
}
