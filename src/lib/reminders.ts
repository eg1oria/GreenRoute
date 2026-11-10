import * as Notifications from 'expo-notifications';
// Перечисления — отдельным импортом: правило import/namespace не находит их внутри Notifications
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Канал Android, в котором приходят напоминания о задачах */
const CHANNEL_ID = 'task-reminders';
/** Накануне срока напоминаем в 9:00 */
const REMINDER_HOUR = 9;

/** В браузере expo-notifications не работает — там напоминания выключены (reminders.web.ts) */
export const remindersSupported: boolean = true;

/** Как показывать уведомление при открытом приложении: баннер и звук, без числа на иконке */
export function configureReminders() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** granted — можно планировать, denied — можно спросить ещё раз, blocked — только через настройки телефона */
export type ReminderPermission = 'granted' | 'denied' | 'blocked';

function allowed(permission: Notifications.NotificationPermissionsStatus): boolean {
  // На iOS «тихое» временное разрешение тоже позволяет доставлять уведомления
  return permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Запрашивает разрешение на уведомления. channelName — название канала в настройках Android */
export async function requestReminderPermission(channelName: string): Promise<ReminderPermission> {
  // Android 13+ показывает окно разрешения, только когда у приложения уже есть канал уведомлений
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: channelName,
      importance: AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  const asked = await Notifications.requestPermissionsAsync();
  if (allowed(asked)) return 'granted';
  return asked.canAskAgain ? 'denied' : 'blocked';
}

/** Накануне срока (ГГГГ-ММ-ДД) в 9:00, или null, если этот момент уже прошёл */
function reminderDate(deadline: string, now: Date): Date | null {
  const [year, month, day] = deadline.split('-').map(Number);
  const dayBefore = new Date(year, month - 1, day - 1, REMINDER_HOUR, 0, 0);
  return dayBefore > now ? dayBefore : null;
}

/**
 * Планирует локальное уведомление о сроке. id нужен, чтобы отменить его вместе с задачей.
 * date: null — до срока меньше суток, и уведомление показано сразу
 */
export async function scheduleTaskReminder(
  deadline: string,
  content: { title: string; body: string },
): Promise<{ id: string; date: Date | null }> {
  const date = reminderDate(deadline, new Date());
  const id = await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: true, data: { open: 'tasks' } },
    // Сразу — без будильника: Android 12+ откладывает неточные будильники на минуты,
    // а точные в Expo Go могут быть запрещены
    trigger: date
      ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID }
      : { channelId: CHANNEL_ID },
  });
  return { id, date };
}

/** Проверочное уведомление: delaySeconds = 0 — показать сразу, иначе через столько секунд */
export async function sendTestNotification(content: { title: string; body: string }, delaySeconds: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: true },
    trigger:
      delaySeconds > 0
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, channelId: CHANNEL_ID }
        : { channelId: CHANNEL_ID },
  });
}

/** Что мешает уведомлениям: разрешение, точные будильники Android (null — не Android) и число запланированных */
export type ReminderStatus = {
  permission: 'granted' | 'denied' | 'undetermined';
  exactAlarms: boolean | null;
  scheduled: number;
};

export async function getReminderStatus(): Promise<ReminderStatus> {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  let exactAlarms: boolean | null = null;
  if (Platform.OS === 'android') {
    exactAlarms = await Notifications.getExactAlarmPermissionsAsync()
      .then((response) => response.granted)
      .catch(() => null);
  }
  return {
    permission: allowed(permission) ? 'granted' : permission.status === 'undetermined' ? 'undetermined' : 'denied',
    exactAlarms,
    scheduled: scheduled.length,
  };
}

/** Отменяет напоминание; для уже показанного или неизвестного id ничего не происходит */
export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Нажатие на напоминание открывает список задач — и в работающем приложении, и при запуске из уведомления */
export function useReminderNavigation(ready: boolean) {
  useEffect(() => {
    // Пока навигация не показана (сплэш), переходить некуда
    if (!ready) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      if (response?.notification.request.content.data?.open !== 'tasks') return;
      // Ответ обработан: при следующем запуске список задач не откроется ещё раз
      Notifications.clearLastNotificationResponse();
      router.push('/tasks');
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [ready]);
}
