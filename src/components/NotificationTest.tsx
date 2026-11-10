import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { useStrings } from '@/i18n';
import {
  getReminderStatus,
  remindersSupported,
  requestReminderPermission,
  sendTestNotification,
  type ReminderStatus,
} from '@/lib/reminders';
import { useTheme } from '@/theme/useTheme';

/** Через сколько секунд приходит отложенное проверочное уведомление */
const TEST_DELAY_SECONDS = 10;

type Note = { text: string; error: boolean; blocked?: boolean };

/** Проверка уведомлений из настроек: прислать сразу или через 10 секунд и увидеть, что может мешать */
export function NotificationTest() {
  const t = useTheme();
  const s = useStrings();
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!remindersSupported) return;
    getReminderStatus()
      .then(setStatus)
      .catch((error) => console.warn(error));
  }, []);

  // При каждом возвращении на вкладку: разрешение могли выдать в настройках телефона
  useFocusEffect(refresh);

  async function send(delaySeconds: number) {
    setBusy(true);
    setNote(null);
    try {
      const permission = await requestReminderPermission(s.reminders.channel);
      if (permission !== 'granted') {
        setNote({ text: s.reminders.denied, error: true, blocked: permission === 'blocked' });
        return;
      }
      await sendTestNotification({ title: s.reminders.testTitle, body: s.reminders.testBody }, delaySeconds);
      if (delaySeconds > 0) setNote({ text: s.reminders.testLaterSent, error: false });
    } catch (error) {
      console.error(error);
      setNote({ text: s.reminders.failed, error: true });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (!remindersSupported) {
    return <Text style={[styles.text, styles.solo, { color: t.textSecondary }]}>{s.reminders.webOnly}</Text>;
  }

  return (
    <View style={styles.box}>
      {status && (
        <Text style={[styles.text, { color: t.textSecondary }]}>
          {s.reminders.permission[status.permission]} · {s.reminders.scheduled(status.scheduled)}
        </Text>
      )}
      {status?.exactAlarms === false && (
        <Text style={[styles.text, { color: t.textSecondary }]}>{s.reminders.inexact}</Text>
      )}
      <Button
        title={s.reminders.testNow}
        icon="notifications-outline"
        variant="accent"
        disabled={busy}
        onPress={() => void send(0)}
      />
      <Button
        title={s.reminders.testLater}
        icon="timer-outline"
        variant="outline"
        disabled={busy}
        onPress={() => void send(TEST_DELAY_SECONDS)}
      />
      {note && (
        <Text accessibilityLiveRegion="polite" style={[styles.text, { color: note.error ? t.danger : t.textSecondary }]}>
          {note.text}
        </Text>
      )}
      {note?.blocked && (
        <Button
          title={s.profile.openSettings}
          icon="settings-outline"
          variant="outline"
          onPress={() => {
            Linking.openSettings().catch((error) => console.error(error));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, paddingVertical: 12 },
  solo: { paddingVertical: 12 },
  text: { fontSize: 14, lineHeight: 20 },
});
