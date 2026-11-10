import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

/** Фото профиля, сохранённое на устройстве */
export type SavedPhoto = {
  /** копия в постоянном каталоге приложения */
  uri: string;
  width: number;
  height: number;
  /** в байтах; пикер сообщает размер не всегда */
  fileSize?: number;
};

/** У каждого пользователя свой ключ — фото одного профиля не попадёт в другой */
const storageKey = (uid: string) => `greenroute/profile/${uid}/photo`;

/**
 * Пикер кладёт снимок во временный кэш, который система может очистить.
 * Каталог документов система не трогает: копия живёт, пока её не удалит само приложение
 */
const photoDirectory = () => new Directory(Paths.document, 'profile-photos');

// В хранилище может лежать что угодно (старая версия, ручная правка) — тогда считаем, что фото нет
function parse(raw: string | null): SavedPhoto | null {
  let saved: unknown;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (!saved || typeof saved !== 'object') return null;
  const { uri, width, height, fileSize } = saved as Record<string, unknown>;
  if (typeof uri !== 'string' || uri.length === 0) return null;
  return {
    uri,
    width: typeof width === 'number' ? width : 0,
    height: typeof height === 'number' ? height : 0,
    fileSize: typeof fileSize === 'number' ? fileSize : undefined,
  };
}

/** Фото из прошлого запуска или null, если записи нет или файл уже пропал */
export async function loadSavedPhoto(uid: string): Promise<SavedPhoto | null> {
  const key = storageKey(uid);
  const saved = parse(await AsyncStorage.getItem(key));
  if (!saved) return null;

  const file = new File(saved.uri);
  if (file.exists) return saved;

  // На iOS путь к каталогу приложения меняется после обновления — ищем копию по имени в текущем каталоге
  const moved = new File(photoDirectory(), file.name);
  if (moved.exists) {
    const relocated = { ...saved, uri: moved.uri };
    await AsyncStorage.setItem(key, JSON.stringify(relocated));
    return relocated;
  }

  await AsyncStorage.removeItem(key);
  return null;
}

/**
 * Копирует выбранный снимок в постоянный каталог и запоминает его URI.
 * Порядок важен: сначала новая копия, затем запись в AsyncStorage и только потом удаление старой копии —
 * при сбое на любом шаге у пользователя остаётся прежнее фото
 */
export async function savePhoto(uid: string, asset: ImagePickerAsset, previousUri: string | null): Promise<SavedPhoto> {
  const directory = photoDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const source = new File(asset.uri);
  // Новое имя при каждой замене: старая копия не перезаписывается, а Image не покажет закэшированный прежний снимок
  const copy = new File(directory, `${uid}-${Date.now()}${source.extension || '.jpg'}`);
  await source.copy(copy);

  const saved: SavedPhoto = { uri: copy.uri, width: asset.width, height: asset.height, fileSize: asset.fileSize };
  try {
    await AsyncStorage.setItem(storageKey(uid), JSON.stringify(saved));
  } catch (error) {
    deleteOwnCopy(copy.uri);
    throw error;
  }

  if (previousUri) deleteOwnCopy(previousUri);
  return saved;
}

/** Забывает фото пользователя и удаляет его копию в каталоге приложения */
export async function removeSavedPhoto(uid: string, uri: string | null): Promise<void> {
  await AsyncStorage.removeItem(storageKey(uid));
  if (uri) deleteOwnCopy(uri);
}

/** Удаляет только свою копию в каталоге приложения — оригинал в галерее телефона не трогаем */
function deleteOwnCopy(uri: string) {
  try {
    const file = new File(uri);
    if (file.uri.startsWith(photoDirectory().uri) && file.exists) file.delete();
  } catch (error) {
    // Лишний файл не мешает работе профиля — достаточно предупреждения в журнале
    console.warn(error);
  }
}
