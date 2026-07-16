export default function RememberMeCheckbox({ id = 'remember-me', checked, onChange }) {
  return (
    <label className="auth-remember" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="auth-remember__input"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="auth-remember__box" aria-hidden="true" />
      <span className="auth-remember__text">Запомнить меня</span>
    </label>
  );
}
