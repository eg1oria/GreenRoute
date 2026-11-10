import type { Strings } from '@/i18n';

export type AuthErrorCode = 'email-in-use' | 'wrong-credentials';

/** Ошибка входа или регистрации, о которой нужно сказать пользователю */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Понятное сообщение вместо кода; прочие ошибки (например, сбой базы) — общим текстом */
export function authErrorMessage(s: Strings, error: unknown): string {
  // Сравниваем по коду, а не через instanceof: так надёжнее после транспиляции классов
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 'email-in-use') return s.auth.error.emailInUse;
  if (code === 'wrong-credentials') return s.auth.error.wrongCredentials;
  return s.auth.error.unknown;
}
