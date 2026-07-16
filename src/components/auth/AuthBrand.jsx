function SparkleIcon() {
  return (
    <svg className="auth-brand__sparkle" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#6EA2FF"
        d="M12 0.8l1.55 7.35L21 9.7l-7.45 1.55L12 18.7l-1.55-7.45L3 9.7l7.45-1.55L12 0.8z"
      />
    </svg>
  );
}

export default function AuthBrand() {
  return (
    <div className="auth-brand" aria-label="Monica">
      <span className="auth-brand__mark">
        <span className="auth-brand__text">Monica</span>
        <SparkleIcon />
      </span>
    </div>
  );
}
