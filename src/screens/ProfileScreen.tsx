import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthForm } from '@/components/AuthForm';
import { FormField, FormInput } from '@/components/FormField';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { Text } from '@/components/Text';
import { Button, Card, ScreenTitle } from '@/components/ui';
import { useStrings } from '@/i18n';
import { authErrorMessage } from '@/lib/authErrors';
import { NAME_MAX_LENGTH } from '@/lib/validation';
import { useAuth, type AuthUser } from '@/store/Auth';
import { useTheme } from '@/theme/useTheme';

/** Вкладка «Профиль»: без входа — вход и регистрация, после входа — фото и имя аккаунта */
export default function ProfileScreen() {
  const t = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const { status, user } = useAuth();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: t.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled">
        <ScreenTitle title={s.profile.title} subtitle={user?.email || undefined} />

        {/* Избранное хранится на устройстве, а не в аккаунте, поэтому доступно и без входа */}
        <Link href="/favorites" asChild>
          <Pressable accessibilityRole="link">
            {({ pressed }) => (
              <Card style={[styles.link, pressed && styles.pressed]}>
                <View style={[styles.linkIcon, { backgroundColor: t.accentSoft }]}>
                  <Ionicons name="star" size={20} color={t.primary} />
                </View>
                <View style={styles.linkMain}>
                  <Text style={[styles.linkTitle, { color: t.text }]}>{s.favorites.title}</Text>
                  <Text style={[styles.linkHint, { color: t.textSecondary }]}>{s.favorites.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
              </Card>
            )}
          </Pressable>
        </Link>

        {status === 'loading' && (
          <View style={styles.loading}>
            <ActivityIndicator color={t.primary} />
            <Text style={[styles.note, { color: t.textSecondary }]}>{s.auth.loading}</Text>
          </View>
        )}
        {status === 'signedOut' && <AuthForm />}
        {/* key: при смене аккаунта фото и поле имени начинают с чистого состояния */}
        {status === 'signedIn' && user && <Account key={user.uid} user={user} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Note = { text: string; error: boolean };

/** Профиль вошедшего пользователя: фото — перед полем имени, как в ЛР 11 */
function Account({ user }: { user: AuthUser }) {
  const s = useStrings();
  const { updateName, signOut } = useAuth();
  // null — имя не редактируют: поле показывает сохранённое имя аккаунта
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  const name = draft ?? user.name;
  const trimmed = name.trim();
  const changed = draft !== null && trimmed !== user.name;

  async function saveName() {
    if (!trimmed) {
      setNote({ text: s.form.required, error: true });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await updateName(trimmed);
      setDraft(null);
      setNote({ text: s.auth.nameSaved, error: false });
    } catch (error) {
      setNote({ text: authErrorMessage(s, error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    setNote(null);
    try {
      // После выхода AuthProvider покажет форму входа, а этот блок исчезнет
      await signOut();
    } catch (error) {
      setNote({ text: authErrorMessage(s, error), error: true });
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <ProfilePhoto />
      </Card>

      <FormField
        label={s.profile.name}
        error={note?.error ? note.text : undefined}
        hint={note && !note.error ? note.text : undefined}
        aside={`${name.length}/${NAME_MAX_LENGTH}`}>
        <FormInput
          invalid={!!note?.error}
          value={name}
          onChangeText={(value) => {
            setDraft(value);
            setNote(null);
          }}
          placeholder={s.profile.namePlaceholder}
          maxLength={NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (changed && !busy) void saveName();
          }}
        />
      </FormField>

      <Button
        title={s.auth.save}
        icon="checkmark"
        variant="accent"
        disabled={!changed || busy}
        onPress={() => void saveName()}
      />
      <Button
        title={s.auth.signOut}
        icon="log-out-outline"
        variant="outline"
        disabled={busy}
        onPress={() => void leave()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  linkIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  linkMain: { flex: 1, gap: 2 },
  linkTitle: { fontSize: 16, fontWeight: '700' },
  linkHint: { fontSize: 13 },
  loading: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  note: { fontSize: 15, lineHeight: 21 },
});
