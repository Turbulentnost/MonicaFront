import { useState } from 'react';
import { authApi } from '../api/client';
import {
  AuthLayout,
  AuthCard,
  AuthBrand,
  AuthLink,
  AuthFooter,
  RegistrationProgress,
} from '../components/auth';
import PhoneStep from '../components/RegisterSteps/PhoneStep';
import CodeStep from '../components/RegisterSteps/CodeStep';
import ProfileStep from '../components/RegisterSteps/ProfileStep';
import AvatarStep from '../components/RegisterSteps/AvatarStep';

const STEPS = ['phone', 'code', 'profile', 'avatar'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [debugCode, setDebugCode] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [botUsername, setBotUsername] = useState('');

  const stepIndex = step + 1;

  const applyPhoneResult = (result = {}) => {
    setDebugCode(result.debugCode || '');
    setTelegramUrl(result.telegramUrl || '');
    setBotUsername(result.botUsername || '');
  };

  const refreshTelegramLink = async () => {
    const { data } = await authApi.registerPhone(phone);
    if (data.phone) setPhone(data.phone);
    applyPhoneResult({
      debugCode: data.debug_code || '',
      telegramUrl: data.telegram_url || '',
      botUsername: data.bot_username || '',
    });
  };

  return (
    <AuthLayout>
      <AuthCard className="register-wizard">
        <AuthBrand />
        <RegistrationProgress currentStep={stepIndex} totalSteps={STEPS.length} />

        {step === 0 && (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            onNext={(result) => {
              applyPhoneResult(result);
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <CodeStep
            phone={phone}
            debugCode={debugCode}
            telegramUrl={telegramUrl}
            botUsername={botUsername}
            setRegistrationToken={setRegistrationToken}
            onRefreshLink={refreshTelegramLink}
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
