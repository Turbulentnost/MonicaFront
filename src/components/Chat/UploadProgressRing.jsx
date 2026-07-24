const SIZE = 28;
const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function UploadProgressRing({
  progress = 0,
  indeterminate = false,
  size = SIZE,
  showLabel = true,
  className = '',
}) {
  const clamped = Math.min(100, Math.max(0, Number(progress) || 0));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <span
      className={['upload-progress-ring', indeterminate ? 'is-indeterminate' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-label={indeterminate ? 'Загрузка файла' : `Загружено ${clamped}%`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} aria-hidden="true">
        <circle
          className="upload-progress-ring__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
        />
        <circle
          className="upload-progress-ring__value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={indeterminate ? CIRCUMFERENCE * 0.72 : offset}
        />
      </svg>
      {!indeterminate && showLabel && (
        <span className="upload-progress-ring__label">{clamped}</span>
      )}
    </span>
  );
}
