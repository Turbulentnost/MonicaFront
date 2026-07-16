function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M4.5 7.5L12 13l7.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = {
  mail: MailIcon,
  lock: LockIcon,
};

export default function AuthInput({
  id,
  label,
  icon,
  error,
  className = '',
  ...props
}) {
  const Icon = icon ? ICONS[icon] : null;
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className={`auth-field ${className}`.trim()}>
      {label && (
        <label className="auth-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={[
          'auth-field__control',
          Icon ? 'auth-field__control--with-icon' : '',
          error ? 'auth-field__control--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {Icon && (
          <span className="auth-field__icon" aria-hidden="true">
            <Icon />
          </span>
        )}
        <input
          id={id}
          className="auth-field__input"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
      </div>
      {error && (
        <p id={describedBy} className="auth-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
