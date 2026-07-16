export default function PrimaryButton({
  children,
  loading = false,
  loadingText,
  className = '',
  disabled,
  type = 'submit',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`auth-primary-btn ${loading ? 'auth-primary-btn--loading' : ''} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className="auth-primary-btn__label">
        {loading ? loadingText || children : children}
      </span>
    </button>
  );
}
