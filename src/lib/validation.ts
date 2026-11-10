export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** new Date переносит лишние дни на следующий месяц (31 февраля → 3 марта), поэтому сверяем все три части */
export function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export type DateProblem = 'empty' | 'format' | 'notExist' | 'past';

/** Проверка срока в формате ГГГГ-ММ-ДД: сегодняшняя дата допустима, вчерашняя — нет */
export function checkFutureDate(value: string): DateProblem | null {
  if (!value) return 'empty';
  if (!datePattern.test(value)) return 'format';
  if (!isRealDate(value)) return 'notExist';

  const selected = new Date(value + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today ? 'past' : null;
}

/** Сколько символов можно ввести в имя профиля */
export const NAME_MAX_LENGTH = 40;
/** Минимальная длина пароля при регистрации */
export const PASSWORD_MIN_LENGTH = 6;

/** Проверка формата email: аккаунт локальный, письма на адрес не отправляются */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
