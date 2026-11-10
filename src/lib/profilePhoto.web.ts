import type * as Native from './profilePhoto';

// expo-file-system в браузере не работает. На вебе фото показывается до перезагрузки страницы,
// а копирование в каталог приложения и восстановление после перезапуска работают на телефоне

export const loadSavedPhoto: typeof Native.loadSavedPhoto = async () => null;

export const savePhoto: typeof Native.savePhoto = async (_uid, asset) => ({
  uri: asset.uri,
  width: asset.width,
  height: asset.height,
  fileSize: asset.fileSize,
});

export const removeSavedPhoto: typeof Native.removeSavedPhoto = async () => {};
