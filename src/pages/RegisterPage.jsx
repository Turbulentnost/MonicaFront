import { useState } from 'react';
import { Link } from 'react-router-dom';
import EmailStep from '../components/RegisterSteps/EmailStep';
import CodeStep from '../components/RegisterSteps/CodeStep';
import ProfileStep from '../components/RegisterSteps/ProfileStep';
import AvatarStep from '../components/RegisterSteps/AvatarStep';

const STEPS = ['email', 'code', 'profile', 'avatar'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');

  const stepIndex = step + 1;

  return (
    <div className="auth-page">
      <div className="auth-form register-wizard">
        <div className="wizard-header">
          <h1>Monica</h1>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(stepIndex / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="step-label">
            Шаг {stepIndex} из {STEPS.length}
          </p>
        </div>

        {step === 0 && (
          <EmailStep email={email} setEmail={setEmail} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <CodeStep
            email={email}
            setRegistrationToken={setRegistrationToken}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ProfileStep registrationToken={registrationToken} onNext={() => setStep(3)} />
        )}
        {step === 3 && <AvatarStep registrationToken={registrationToken} />}

        {step < 3 && (
          <p className="auth-link">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        )}
      </div>
    </div>
  );
}
