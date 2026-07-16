export default function RegistrationProgress({ currentStep = 1, totalSteps = 4 }) {
  return (
    <div className="auth-progress">
      <p className="auth-progress__label">
        Шаг {currentStep} из {totalSteps}
      </p>
      <div
        className="auth-progress__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label={`Шаг ${currentStep} из ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const active = step <= currentStep;
          return (
            <span
              key={step}
              className={`auth-progress__segment ${active ? 'auth-progress__segment--active' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}
