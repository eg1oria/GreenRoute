import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Language } from '@/i18n/languages';

// Бесплатный машинный перевод без ключа. Лимит — около 5000 символов в день с одного IP,
// поэтому каждый переведённый фрагмент кэшируется и больше не запрашивается.
const TRANSLATE_URL = 'https://api.mymemory.translated.net/get';
/** Язык, на котором приходят новости */
export const SOURCE_LANGUAGE: Language = 'en';

const CACHE_KEY = 'greenroute/translations/v1';
const SAVE_DELAY_MS = 500;

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number | string;
  responseDetails?: string;
  quotaFinished?: boolean;
};

// Ключ — язык и исходный фрагмент: `ru\nHello.`
let cache: Record<string, string> | null = null;
let cacheLoading: Promise<Record<string, string>> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadCache(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  cacheLoading ??= AsyncStorage.getItem(CACHE_KEY)
    .then((raw) => JSON.parse(raw ?? '{}'))
    .catch(() => ({}))
    .then((saved) => {
      cache = saved && typeof saved === 'object' ? saved : {};
      return cache!;
    });
  return cacheLoading;
}

// Фрагменты переводятся параллельно — пишем в хранилище один раз, когда они закончились
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (cache) AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
  }, SAVE_DELAY_MS);
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

function decodeEntities(text: string): string {
  return text.replace(/&(amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity]);
}

/** Сервис принимает до 500 байт за раз, поэтому текст переводим по предложениям */
export function splitSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean);
  return sentences?.length ? sentences : [text];
}

async function translateSentence(sentence: string, target: Language, signal?: AbortSignal): Promise<string> {
  const saved = await loadCache();
  const key = target + '\n' + sentence;
  if (saved[key]) return saved[key];

  const url = `${TRANSLATE_URL}?q=${encodeURIComponent(sentence)}&langpair=${SOURCE_LANGUAGE}|${target}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data: MyMemoryResponse = await response.json();
  const translated = data.responseData?.translatedText;
  // Когда лимит исчерпан, сервис отвечает статусом в теле, а вместо перевода присылает предупреждение
  if (Number(data.responseStatus) !== 200 || data.quotaFinished || !translated) {
    throw new Error(data.responseDetails || 'Translation failed');
  }

  saved[key] = decodeEntities(translated);
  scheduleSave();
  return saved[key];
}

export async function translateText(text: string, target: Language, signal?: AbortSignal): Promise<string> {
  if (target === SOURCE_LANGUAGE || !text.trim()) return text;
  const parts = await Promise.all(splitSentences(text).map((sentence) => translateSentence(sentence, target, signal)));
  return parts.join(' ');
}
