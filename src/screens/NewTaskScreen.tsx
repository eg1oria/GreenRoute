import Ionicons from '@expo/vector-icons/Ionicons';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField, FormInput } from '@/components/FormField';
import { Text } from '@/components/Text';
import { Button, Card, SegmentedControl } from '@/components/ui';
import { useStrings } from '@/i18n';
import { remindersSupported, requestReminderPermission, scheduleTaskReminder } from '@/lib/reminders';
import { checkFutureDate } from '@/lib/validation';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/theme/useTheme';
import type { Category, Effort, Priority, TaskErrors, TaskForm } from '@/types/task';

const TITLE_MAX = 80;
const SUBJECT_MAX = 60;
const DESCRIPTION_MAX = 200;
const TITLE_MIN = 3;
const DESCRIPTION_MIN = 10;
const EFFORTS: Exclude<Effort, ''>[] = ['1', '2', '3', '4', '5'];

export default function NewTaskScreen() {
  const t = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { addTask } = useAppStore();

  // Каждое поле формы — в своём состоянии
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('');
  const [category, setCategory] = useState<Category>('');
  const [effort, setEffort] = useState<Effort>('');
  const [reminder, setReminder] = useState(false);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<TaskErrors>({});
  const [added, setAdded] = useState<string | null>(null);
  // Почему напоминание не включилось; blocked — разрешение можно дать только в настройках телефона
  const [reminderNote, setReminderNote] = useState<{ text: string; blocked: boolean } | null>(null);
  // Планирование уведомления асинхронное — ref не даёт отправить форму дважды
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Новый ввод убирает ошибку только у изменённого поля
  const edit = <T,>(field: keyof TaskErrors, setValue: (value: T) => void) => (value: T) => {
    setValue(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setAdded(null);
  };

  function validate(): TaskErrors {
    const next: TaskErrors = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      next.title = s.form.required;
    } else if (cleanTitle.length < TITLE_MIN) {
      next.title = s.form.minLength(TITLE_MIN);
    }

    if (!subject.trim()) {
      next.subject = s.taskForm.subjectEmpty;
    }

    const dateProblem = checkFutureDate(deadline);
    if (dateProblem) {
      next.deadline = s.form.date[dateProblem];
    }

    if (!priority) next.priority = s.taskForm.priorityEmpty;
    if (!category) next.category = s.taskForm.categoryEmpty;
    if (!effort) next.effort = s.taskForm.effortEmpty;

    const cleanDescription = description.trim();
    if (!cleanDescription) {
      next.description = s.form.required;
    } else if (cleanDescription.length < DESCRIPTION_MIN) {
      next.description = s.form.minLength(DESCRIPTION_MIN);
    }

    return next;
  }

  function resetForm() {
    setTitle('');
    setSubject('');
    setDeadline('');
    setPriority('');
    setCategory('');
    setEffort('');
    setReminder(false);
    setReminderNote(null);
    setDescription('');
    setErrors({});
  }

  // Разрешение на уведомления спрашиваем сразу, когда пользователь включает напоминание
  async function toggleReminder(on: boolean) {
    setReminderNote(null);
    setReminder(on);
    if (!on) return;
    try {
      const permission = await requestReminderPermission(s.reminders.channel);
      if (permission === 'granted') return;
      setReminder(false);
      setReminderNote({ text: s.reminders.denied, blocked: permission === 'blocked' });
    } catch (error) {
      console.error(error);
      setReminder(false);
      setReminderNote({ text: s.reminders.failed, blocked: false });
    }
  }

  async function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);

    const task: TaskForm = {
      title: title.trim(),
      subject: subject.trim(),
      deadline,
      priority: priority as Exclude<Priority, ''>,
      category: category as Exclude<Category, ''>,
      effort: Number(effort),
      reminder,
      description: description.trim(),
    };

    // Напоминание — локальное уведомление на этом телефоне: накануне срока в 9:00
    let reminderId: string | undefined;
    let reminderText = '';
    if (task.reminder) {
      try {
        const scheduled = await scheduleTaskReminder(task.deadline, {
          title: s.reminders.title,
          body: s.reminders.body(task.title, s.format.day(task.deadline)),
        });
        reminderId = scheduled.id;
        reminderText = scheduled.date ? s.reminders.at(s.format.date(scheduled.date.toISOString())) : s.reminders.soon;
      } catch (error) {
        console.error(error);
        // Задачу всё равно сохраняем, но без отметки о напоминании
        task.reminder = false;
        reminderText = s.reminders.failed;
      }
    }

    addTask(task, reminderId);
    resetForm();
    const message = reminderText ? `${s.taskForm.added(task.title)}\n${reminderText}` : s.taskForm.added(task.title);
    setAdded(message);
    // Баннер с результатом — вверху формы, а кнопка отправки внизу
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    Alert.alert(s.form.doneTitle, message);
    submittingRef.current = false;
    setSubmitting(false);
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: t.background }}
        contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        {added && (
          <View style={[styles.banner, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="checkmark-circle" size={20} color={t.primary} />
            <Text style={[styles.bannerText, { color: t.text }]}>{added}</Text>
          </View>
        )}

        <FormField label={s.taskForm.title} error={errors.title}>
          <FormInput
            invalid={!!errors.title}
            value={title}
            onChangeText={edit('title', setTitle)}
            placeholder={s.taskForm.titlePlaceholder}
            maxLength={TITLE_MAX}
          />
        </FormField>

        <FormField label={s.taskForm.subject} error={errors.subject}>
          <FormInput
            invalid={!!errors.subject}
            value={subject}
            onChangeText={edit('subject', setSubject)}
            placeholder={s.taskForm.subjectPlaceholder}
            maxLength={SUBJECT_MAX}
          />
        </FormField>

        <FormField label={s.taskForm.deadline} error={errors.deadline} hint={s.form.dateHint}>
          <FormInput
            invalid={!!errors.deadline}
            value={deadline}
            onChangeText={edit('deadline', setDeadline)}
            placeholder="2026-11-05"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </FormField>

        <FormField label={s.taskForm.priority} error={errors.priority}>
          <SegmentedControl<Priority>
            options={[
              { value: 'normal', label: s.tasks.priority.normal, icon: 'flag-outline' },
              { value: 'high', label: s.tasks.priority.high, icon: 'flame-outline' },
            ]}
            value={priority}
            onChange={edit('priority', setPriority)}
          />
        </FormField>

        <FormField label={s.taskForm.category} error={errors.category}>
          <SegmentedControl<Category>
            options={[
              { value: 'study', label: s.tasks.category.study, icon: 'book-outline' },
              { value: 'project', label: s.tasks.category.project, icon: 'construct-outline' },
              { value: 'exam', label: s.tasks.category.exam, icon: 'school-outline' },
              { value: 'other', label: s.tasks.category.other, icon: 'ellipsis-horizontal' },
            ]}
            value={category}
            onChange={edit('category', setCategory)}
          />
        </FormField>

        <FormField label={s.taskForm.effort} error={errors.effort} hint={s.taskForm.effortHint}>
          <SegmentedControl<Effort>
            options={EFFORTS.map((value) => ({ value, label: value }))}
            value={effort}
            onChange={edit('effort', setEffort)}
          />
        </FormField>

        <Card style={styles.reminderCard}>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchLabel, { color: t.text }]}>{s.taskForm.reminder}</Text>
              <Text style={[styles.switchHint, { color: t.textSecondary }]}>
                {remindersSupported ? s.taskForm.reminderHint : s.reminders.webOnly}
              </Text>
            </View>
            <Switch
              accessibilityLabel={s.taskForm.reminder}
              value={reminder}
              onValueChange={(on) => void toggleReminder(on)}
              disabled={!remindersSupported}
              trackColor={{ true: t.accent, false: t.border }}
              thumbColor={Platform.OS === 'android' ? (reminder ? t.primary : t.card) : undefined}
            />
          </View>
          {reminderNote && (
            <Text accessibilityLiveRegion="polite" style={[styles.switchHint, { color: t.danger }]}>
              {reminderNote.text}
            </Text>
          )}
          {reminderNote?.blocked && (
            <Button
              title={s.profile.openSettings}
              icon="settings-outline"
              variant="outline"
              onPress={() => {
                Linking.openSettings().catch((error) => console.error(error));
              }}
            />
          )}
        </Card>

        <FormField
          label={s.taskForm.description}
          error={errors.description}
          aside={`${description.length}/${DESCRIPTION_MAX}`}>
          <FormInput
            invalid={!!errors.description}
            value={description}
            onChangeText={edit('description', setDescription)}
            placeholder={s.taskForm.descriptionPlaceholder}
            multiline
            maxLength={DESCRIPTION_MAX}
          />
        </FormField>

        {errorCount > 0 && (
          <Text style={[styles.summary, { color: t.danger }]}>{s.form.fixErrors(errorCount)}</Text>
        )}
        <Button
          title={s.taskForm.submit}
          icon="add-circle-outline"
          disabled={submitting}
          onPress={() => void handleSubmit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: 16, gap: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  reminderCard: { gap: 10, paddingVertical: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, fontWeight: '700' },
  switchHint: { fontSize: 13, marginTop: 2 },
  summary: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
