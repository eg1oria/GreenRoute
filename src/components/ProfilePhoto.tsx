import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
// Text и Button — из проекта, а не из react-native: они следуют теме и настройке «Размер шрифта»
import { Image, Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, SegmentedControl } from '@/components/ui';
import { useStrings } from '@/i18n';
import { confirmDestructive } from '@/lib/dialog';
import { loadSavedPhoto, removeSavedPhoto, savePhoto, type SavedPhoto } from '@/lib/profilePhoto';
import { useCurrentUser } from '@/store/Auth';
import { useTheme } from '@/theme/useTheme';

/** Учебное ограничение размера фото */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 180;

type Quality = '1' | '0.8' | '0.5';
const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: '1', label: '1' },
  { value: '0.8', label: '0.8' },
  { value: '0.5', label: '0.5' },
];

/** Что известно о текущем фото: размеры и вес файла, если пикер его сообщил */
type PhotoInfo = Omit<SavedPhoto, 'uri'>;

export function ProfilePhoto() {
  const t = useTheme();
  const s = useStrings();
  // uid вошедшего аккаунта: у каждого пользователя своё фото
  const { uid } = useCurrentUser();

  // uri — путь к фото, busy блокирует повторное нажатие, message объясняет результат,
  // settings показывает кнопку настроек, когда повторно спросить разрешение нельзя
  const [uri, setUri] = useState<string | null>(null);
  // Сначала true: пока читается фото из прошлого запуска, новое выбрать нельзя — ответ его бы перезаписал
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState(false);
  // Задание 2: размеры и вес текущего фото
  const [info, setInfo] = useState<PhotoInfo | null>(null);
  // Задание 3: квадратная обрезка и сжатие (0.8 — значение из основной части работы)
  const [crop, setCrop] = useState(true);
  const [quality, setQuality] = useState<Quality>('0.8');
  // busy обновляется только после перерисовки — ref не даёт открыть пикер дважды при быстром двойном нажатии
  const locked = useRef(true);

  // Доп. задание: фото, сохранённое в постоянном каталоге при прошлом запуске
  useEffect(() => {
    let active = true;
    loadSavedPhoto(uid)
      .then((saved) => {
        if (!active || !saved) return;
        setUri(saved.uri);
        setInfo({ width: saved.width, height: saved.height, fileSize: saved.fileSize });
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!active) return;
        locked.current = false;
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  async function choosePhoto(source: 'camera' | 'gallery') {
    if (busy || locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setSettings(false);
    try {
      // Камера открывается только после разрешения
      if (source === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
          setMessage(s.profile.cameraDenied);
          setSettings(!p.canAskAgain);
          return;
        }
      }

      // aspect учитывает только Android — на iOS рамка обрезки всегда квадратная
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: Number(quality),
        allowsEditing: crop,
        aspect: [1, 1],
      };
      // Для одного фото из системного пикера доступ ко всей галерее заранее не запрашиваем
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      // Отмена не меняет uri
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;

      // Задание 2: размер проверяем до обновления аватара — при отказе остаётся прежнее фото
      if (asset.fileSize !== undefined && asset.fileSize > MAX_PHOTO_BYTES) {
        setMessage(s.profile.tooLarge(s.format.fileSize(asset.fileSize), s.format.fileSize(MAX_PHOTO_BYTES)));
        return;
      }

      // Доп. задание: снимок из кэша копируется в каталог приложения, иначе он может пропасть
      let saved: SavedPhoto;
      try {
        saved = await savePhoto(uid, asset, uri);
      } catch (error) {
        console.error(error);
        setMessage(s.profile.saveFailed);
        return;
      }
      setUri(saved.uri);
      setInfo({ width: saved.width, height: saved.height, fileSize: saved.fileSize });
    } catch (error) {
      console.error(error);
      setMessage(s.profile.openFailed);
    } finally {
      // Выполняется при успехе, ошибке и раннем return
      locked.current = false;
      setBusy(false);
    }
  }

  // Задание 1: удаляется только фото профиля — снимок в галерее телефона остаётся
  async function deletePhoto() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    setSettings(false);
    try {
      await removeSavedPhoto(uid, uri);
      setUri(null);
      setInfo(null);
    } catch (error) {
      console.error(error);
      setMessage(s.profile.deleteFailed);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  function confirmDelete() {
    confirmDestructive({
      title: s.profile.deleteTitle,
      message: s.profile.deleteMessage,
      cancelText: s.common.cancel,
      confirmText: s.profile.delete,
      onConfirm: () => {
        void deletePhoto();
      },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarBlock}>
        {uri ? (
          <Image
            source={{ uri }}
            style={[styles.avatar, { backgroundColor: t.accentSoft }]}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={s.profile.photo}
          />
        ) : (
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={s.profile.noPhoto}
            style={[styles.avatar, styles.placeholder, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="person" size={72} color={t.primary} />
            <Text style={[styles.placeholderText, { color: t.textSecondary }]}>{s.profile.noPhoto}</Text>
          </View>
        )}

        {info && (
          <View style={styles.details}>
            <Text style={[styles.detailsText, { color: t.textSecondary }]}>
              {info.width > 0 && info.height > 0
                ? s.profile.dimensions(info.width, info.height)
                : s.profile.dimensionsUnknown}
              {info.fileSize !== undefined && ` · ${s.format.fileSize(info.fileSize)}`}
            </Text>
            {/* Задание 2: неизвестный размер — отдельное сообщение, вес выводится только при наличии fileSize */}
            {info.fileSize === undefined && (
              <Text style={[styles.detailsText, { color: t.textSecondary }]}>
                {s.profile.sizeUnknown(s.format.fileSize(MAX_PHOTO_BYTES))}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title={s.profile.choosePhoto}
          icon="images-outline"
          disabled={busy}
          onPress={() => void choosePhoto('gallery')}
        />
        <Button
          title={s.profile.takePhoto}
          icon="camera-outline"
          variant="accent"
          disabled={busy}
          onPress={() => void choosePhoto('camera')}
        />
        {uri !== null && (
          <Button
            title={s.profile.deletePhoto}
            icon="trash-outline"
            variant="outline"
            disabled={busy}
            onPress={confirmDelete}
          />
        )}
      </View>

      {!!message && (
        <Text accessibilityLiveRegion="polite" style={[styles.message, { color: t.danger }]}>
          {message}
        </Text>
      )}
      {settings && (
        <Button
          title={s.profile.openSettings}
          icon="settings-outline"
          variant="outline"
          onPress={() => {
            Linking.openSettings().catch((error) => console.error(error));
          }}
        />
      )}

      <View style={[styles.params, { borderTopColor: t.border }]}>
        <Text style={[styles.paramsTitle, { color: t.textSecondary }]}>{s.profile.shotSettings}</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={[styles.label, { color: t.text }]}>{s.profile.crop}</Text>
            <Text style={[styles.hint, { color: t.textSecondary }]}>{s.profile.cropHint}</Text>
          </View>
          <Switch
            accessibilityLabel={s.profile.crop}
            value={crop}
            onValueChange={setCrop}
            trackColor={{ true: t.accent, false: t.border }}
            thumbColor={Platform.OS === 'android' ? (crop ? t.primary : t.card) : undefined}
          />
        </View>
        <Text style={[styles.label, { color: t.text }]}>{s.profile.quality}</Text>
        <SegmentedControl options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
        <Text style={[styles.hint, { color: t.textSecondary }]}>{s.profile.qualityHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  avatarBlock: { alignItems: 'center', gap: 8 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  placeholderText: { fontSize: 14, fontWeight: '600' },
  details: { alignItems: 'center', gap: 2 },
  detailsText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  actions: { gap: 8 },
  message: { fontSize: 15, lineHeight: 21 },
  params: { gap: 10, marginTop: 4, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  paramsTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
});
