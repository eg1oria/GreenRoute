import Ionicons from '@expo/vector-icons/Ionicons';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField, FormInput } from '@/components/FormField';
import { Text } from '@/components/Text';
import { Button } from '@/components/ui';
import { useStrings } from '@/i18n';
import { checkFutureDate } from '@/lib/validation';
import { useTheme } from '@/theme/useTheme';
import type { EventErrors, EventForm } from '@/types/task';

const TITLE_MAX = 80;
const PLACE_MAX = 80;
const DESCRIPTION_MAX = 200;
const TITLE_MIN = 3;
const DESCRIPTION_MIN = 10;
const PARTICIPANTS_MIN = 1;
const PARTICIPANTS_MAX = 100;

export default function NewEventScreen() {
  const t = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  // Число участников вводится текстом и превращается в число только после проверки
  const [participants, setParticipants] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<EventErrors>({});
  const [added, setAdded] = useState<string | null>(null);

  const edit = (field: keyof EventErrors, setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setAdded(null);
  };

  function validate(): EventErrors {
    const next: EventErrors = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      next.title = s.form.required;
    } else if (cleanTitle.length < TITLE_MIN) {
      next.title = s.form.minLength(TITLE_MIN);
    }

    const dateProblem = checkFutureDate(date);
    if (dateProblem) {
      next.date = s.form.date[dateProblem];
    }

    if (!place.trim()) {
      next.place = s.eventForm.placeEmpty;
    }

    const cleanParticipants = participants.trim();
    if (!cleanParticipants) {
      next.participants = s.form.required;
    } else if (!/^\d+$/.test(cleanParticipants)) {
      next.participants = s.eventForm.participantsNumber;
    } else {
      const count = Number(cleanParticipants);
      if (count < PARTICIPANTS_MIN || count > PARTICIPANTS_MAX) {
        next.participants = s.eventForm.participantsRange;
      }
    }

    const cleanDescription = description.trim();
    if (!cleanDescription) {
      next.description = s.form.required;
    } else if (cleanDescription.length < DESCRIPTION_MIN) {
      next.description = s.form.minLength(DESCRIPTION_MIN);
    }

    return next;
  }

  function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const event: EventForm = {
      title: title.trim(),
      date,
      place: place.trim(),
      participants: Number(participants.trim()),
      description: description.trim(),
    };

    setTitle('');
    setDate('');
    setPlace('');
    setParticipants('');
    setDescription('');
    setAdded(s.eventForm.added(event.title));
    // Баннер с результатом — вверху формы, а кнопка отправки внизу
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    Alert.alert(s.form.doneTitle, s.eventForm.added(event.title));
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

        <FormField label={s.eventForm.title} error={errors.title}>
          <FormInput
            invalid={!!errors.title}
            value={title}
            onChangeText={edit('title', setTitle)}
            placeholder={s.eventForm.titlePlaceholder}
            maxLength={TITLE_MAX}
          />
        </FormField>

        <FormField label={s.eventForm.date} error={errors.date} hint={s.form.dateHint}>
          <FormInput
            invalid={!!errors.date}
            value={date}
            onChangeText={edit('date', setDate)}
            placeholder="2026-11-05"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </FormField>

        <FormField label={s.eventForm.place} error={errors.place}>
          <FormInput
            invalid={!!errors.place}
            value={place}
            onChangeText={edit('place', setPlace)}
            placeholder={s.eventForm.placePlaceholder}
            maxLength={PLACE_MAX}
          />
        </FormField>

        <FormField label={s.eventForm.participants} error={errors.participants} hint={s.eventForm.participantsHint}>
          <FormInput
            invalid={!!errors.participants}
            value={participants}
            onChangeText={edit('participants', setParticipants)}
            placeholder="30"
            keyboardType="number-pad"
            maxLength={3}
          />
        </FormField>

        <FormField
          label={s.eventForm.description}
          error={errors.description}
          aside={`${description.length}/${DESCRIPTION_MAX}`}>
          <FormInput
            invalid={!!errors.description}
            value={description}
            onChangeText={edit('description', setDescription)}
            placeholder={s.eventForm.descriptionPlaceholder}
            multiline
            maxLength={DESCRIPTION_MAX}
          />
        </FormField>

        {errorCount > 0 && (
          <Text style={[styles.summary, { color: t.danger }]}>{s.form.fixErrors(errorCount)}</Text>
        )}
        <Button title={s.eventForm.submit} icon="calendar-outline" onPress={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: 16, gap: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  summary: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
