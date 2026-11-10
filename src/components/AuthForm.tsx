import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { FormField, FormInput } from '@/components/FormField';
import { Text } from '@/components/Text';
import { Button, Card, SegmentedControl } from '@/components/ui';
import { useStrings } from '@/i18n';
import { authErrorMessage } from '@/lib/authErrors';
import { isEmail, NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/validation';
import { useAuth } from '@/store/Auth';
import { useTheme } from '@/theme/useTheme';

type Mode = 'signIn' | 'signUp';
type Field = 'name' | 'email' | 'password' | 'repeat';

/** Вход и регистрация по email и паролю; аккаунты хранятся на устройстве */
export function AuthForm() {
  const t = useTheme();
  const s = useStrings();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  // Ошибки полей появляются после первой попытки отправить форму и дальше обновляются при вводе
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  // Ошибка входа или регистрации целиком, например «Неверный email или пароль»
  const [message, setMessage] = useState('');
  // busy обновляется только после перерисовки — ref не даёт отправить форму дважды
  const locked = useRef(false);

  const signingUp = mode === 'signUp';
  const trimmedEmail = email.trim();

  const errors: Partial<Record<Field, string>> = {};
  if (signingUp && !name.trim()) errors.name = s.form.required;
  if (!trimmedEmail) errors.email = s.form.required;
  else if (!isEmail(trimmedEmail)) errors.email = s.auth.emailInvalid;
  if (!password) errors.password = s.form.required;
  else if (signingUp && password.length < PASSWORD_MIN_LENGTH) errors.password = s.form.minLength(PASSWORD_MIN_LENGTH);
  if (signingUp && repeat !== password) errors.repeat = s.auth.passwordMismatch;
  const shown = submitted ? errors : {};

  function switchMode(next: Mode) {
    setMode(next);
    setSubmitted(false);
    setMessage('');
  }

  async function submit() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      // После успешного входа AuthProvider переключит профиль, и форма исчезнет сама
      if (signingUp) await signUp(name.trim(), trimmedEmail, password);
      else await signIn(trimmedEmail, password);
    } catch (error) {
      setMessage(authErrorMessage(s, error));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[styles.intro, { color: t.textSecondary }]}>{s.auth.intro}</Text>
      <SegmentedControl<Mode>
        options={[
          { value: 'signIn', label: s.auth.signIn, icon: 'log-in-outline' },
          { value: 'signUp', label: s.auth.signUp, icon: 'person-add-outline' },
        ]}
        value={mode}
        onChange={switchMode}
      />

      {signingUp && (
        <FormField label={s.profile.name} error={shown.name}>
          <FormInput
            invalid={!!shown.name}
            value={name}
            onChangeText={setName}
            placeholder={s.profile.namePlaceholder}
            maxLength={NAME_MAX_LENGTH}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
        </FormField>
      )}

      <FormField label={s.auth.email} error={shown.email}>
        <FormInput
          invalid={!!shown.email}
          value={email}
          onChangeText={setEmail}
          placeholder={s.auth.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
      </FormField>

      <FormField
        label={s.auth.password}
        error={shown.password}
        hint={signingUp ? s.auth.passwordHint(PASSWORD_MIN_LENGTH) : undefined}>
        <FormInput
          invalid={!!shown.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          textContentType={signingUp ? 'newPassword' : 'password'}
        />
      </FormField>

      {signingUp && (
        <FormField label={s.auth.passwordRepeat} error={shown.repeat}>
          <FormInput
            invalid={!!shown.repeat}
            value={repeat}
            onChangeText={setRepeat}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </FormField>
      )}

      {!!message && (
        <Text accessibilityLiveRegion="polite" style={[styles.message, { color: t.danger }]}>
          {message}
        </Text>
      )}

      <Button
        title={signingUp ? s.auth.submitSignUp : s.auth.submitSignIn}
        icon={signingUp ? 'person-add' : 'log-in'}
        disabled={busy}
        onPress={() => void submit()}
      />

      <Text style={[styles.note, { color: t.textSecondary }]}>{s.auth.localNote}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  intro: { fontSize: 15, lineHeight: 21 },
  message: { fontSize: 15, lineHeight: 21 },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
