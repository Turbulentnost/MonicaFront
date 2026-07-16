import { useState } from 'react';
import {
  AuthLayout,
  AuthCard,
  AuthBrand,
  AuthLink,
  AuthFooter,
  RegistrationProgress,
} from '../components/auth';
import EmailStep from '../components/RegisterSteps/EmailStep';
import CodeStep from '../components/RegisterSteps/CodeStep';
import ProfileStep from '../components/RegisterSteps/ProfileStep';
import AvatarStep from '../components/RegisterSteps/AvatarStep';

const STEPS = ['email', 'code', 'profile', 'avatar'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [debugCode, setDebugCode] = useState('');

  const stepIndex = step + 1;

  return (
    <AuthLayout>
      <AuthCard className="register-wizard">
        <AuthBrand />
        <RegistrationProgress currentStep={stepIndex} totalSteps={STEPS.length} />

        {step === 0 && (
          <EmailStep
            email={email}
            setEmail={setEmail}
            onNext={(code) => {
              setDebugCode(code || '');
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <CodeStep
            email={email}
            debugCode={debugCode}
            setRegistrationToken={setRegistrationToken}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <ProfileStep registrationToken={registrationToken} onNext={() => setStep(3)} />
        )}
        {step === 3 && <AvatarStep registrationToken={registrationToken} />}

        {step < 3 && (
          <AuthFooter>
            Уже есть аккаунт? <AuthLink to="/login">Войти</AuthLink>
          </AuthFooter>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
