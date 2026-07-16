import { Link } from 'react-router-dom';

export default function AuthLink({ to, children, className = '', ...props }) {
  return (
    <Link to={to} className={`auth-link-accent ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}

export function AuthFooter({ children }) {
  return <p className="auth-footer">{children}</p>;
}
