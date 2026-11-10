import type * as Native from './reminders';

// expo-notifications в браузере не работает: переключатель напоминания там выключен, а эти функции ничего не делают

export const remindersSupported: typeof Native.remindersSupported = false;

export const configureReminders: typeof Native.configureReminders = () => {};

export const useReminderNavigation: typeof Native.useReminderNavigation = () => {};

export const requestReminderPermission: typeof Native.requestReminderPermission = async () => 'denied';

export const scheduleTaskReminder: typeof Native.scheduleTaskReminder = async () => {
  throw new Error('Напоминания работают только в приложении на телефоне');
};

export const cancelReminder: typeof Native.cancelReminder = async () => {};

export const sendTestNotification: typeof Native.sendTestNotification = async () => {
  throw new Error('Уведомления работают только в приложении на телефоне');
};

export const getReminderStatus: typeof Native.getReminderStatus = async () => ({
  permission: 'denied',
  exactAlarms: null,
  scheduled: 0,
});
