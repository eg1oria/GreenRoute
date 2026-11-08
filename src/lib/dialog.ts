import { Alert, Platform } from 'react-native';

// Alert.alert на вебе ничего не показывает, поэтому там используются окна браузера

export function showMessage(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

type ConfirmOptions = {
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  onConfirm: () => void;
};

/** «Отмена» ничего не вызывает: onConfirm срабатывает только после подтверждения */
export function confirmDestructive({ title, message, cancelText, confirmText, onConfirm }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}
