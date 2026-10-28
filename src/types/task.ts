/** Пустая строка означает, что выбор ещё не сделан */
export type Priority = 'normal' | 'high' | '';
export type Category = 'study' | 'project' | 'exam' | 'other' | '';
/** Трудоёмкость 1–5 — строкой, потому что её выбирают в SegmentedControl */
export type Effort = '1' | '2' | '3' | '4' | '5' | '';

/** Сообщения только для полей, в которых найдена ошибка */
export type TaskErrors = {
  title?: string;
  subject?: string;
  deadline?: string;
  priority?: string;
  category?: string;
  effort?: string;
  description?: string;
};

/** Уже проверенная задача: пустых вариантов выбора в ней нет */
export type TaskForm = {
  title: string;
  subject: string;
  /** ГГГГ-ММ-ДД */
  deadline: string;
  priority: Exclude<Priority, ''>;
  category: Exclude<Category, ''>;
  effort: number;
  reminder: boolean;
  description: string;
};

export type Task = TaskForm & { id: string; createdAt: string };

export type EventErrors = {
  title?: string;
  date?: string;
  place?: string;
  participants?: string;
  description?: string;
};

export type EventForm = {
  title: string;
  /** ГГГГ-ММ-ДД */
  date: string;
  place: string;
  participants: number;
  description: string;
};
