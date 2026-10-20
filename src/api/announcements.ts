import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Announcement, AnnouncementsResponse } from '@/types/announcement';

// Expo встраивает только process.env.EXPO_PUBLIC_* через точку — деструктуризация не сработает
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://dummyjson.com';
// select оставляет только поля типа Announcement — теги, реакции и просмотры экрану не нужны
const FIELDS = 'select=title,body,userId';
const ANNOUNCEMENTS_URL = API_URL + '/posts?limit=10&' + FIELDS;

// v2: в v1 лежали записи JSONPlaceholder с теми же id, но другим текстом
const CACHE_KEY = 'greenroute/news/v2';

export async function getAnnouncements(signal?: AbortSignal): Promise<Announcement[]> {
  const response = await fetch(ANNOUNCEMENTS_URL, { signal });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  const { posts }: AnnouncementsResponse = await response.json();
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(posts)).catch(() => {});
  return posts;
}

export async function getAnnouncement(id: number, signal?: AbortSignal): Promise<Announcement> {
  const response = await fetch(API_URL + '/posts/' + id + '?' + FIELDS, { signal });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json() as Promise<Announcement>;
}

/** Последний успешно загруженный список — показываем его, когда нет сети */
export async function getCachedAnnouncements(): Promise<Announcement[]> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** Отменённый запрос — не ошибка: экран просто закрыли или запустили новый */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
