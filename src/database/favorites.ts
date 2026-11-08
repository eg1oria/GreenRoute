import * as SQLite from 'expo-sqlite';

export type SavedPost = {
  /** ID исходного объявления: одному объявлению соответствует одна строка */
  id: number;
  title: string;
  body: string;
  /** 0 — не прочитано, 1 — прочитано */
  isRead: 0 | 1;
};

export type PostInput = Pick<SavedPost, 'id' | 'title' | 'body'>;

let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/** База отдаётся только после создания таблицы; неудачное открытие не кэшируется, чтобы следующая операция попробовала снова */
function readyDb(): Promise<SQLite.SQLiteDatabase> {
  if (!connection) {
    connection = (async () => {
      const db = await SQLite.openDatabaseAsync('campus_favorites.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          isRead INTEGER NOT NULL DEFAULT 0
            CHECK (isRead IN (0, 1))
        );
      `);
      return db;
    })().catch((error) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

/** CREATE: 1 — запись добавлена, 0 — объявление уже сохранено */
export async function savePost(post: PostInput): Promise<number> {
  const db = await readyDb();
  const result = await db.runAsync(
    `INSERT INTO favorites
       (id, title, body) VALUES (?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    post.id,
    post.title,
    post.body,
  );
  return result.changes;
}

/** READ: сначала непрочитанные, затем новые. Сеть не используется */
export async function getSavedPosts(): Promise<SavedPost[]> {
  const db = await readyDb();
  return db.getAllAsync<SavedPost>(
    `SELECT id, title, body, isRead
     FROM favorites
     ORDER BY isRead ASC, id DESC`,
  );
}

/** Одна сохранённая запись: нужна, чтобы открыть новость без сети */
export async function getSavedPost(id: number): Promise<SavedPost | null> {
  const db = await readyDb();
  return db.getFirstAsync<SavedPost>('SELECT id, title, body, isRead FROM favorites WHERE id = ?', id);
}

/** UPDATE: отмечает записи прочитанными, когда пользователь открыл новость. Повтор безопасен: прочитанное остаётся прочитанным */
export async function markRead(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await readyDb();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`UPDATE favorites SET isRead = 1 WHERE isRead = 0 AND id IN (${placeholders})`, ids);
}

/** DELETE: удаляется только локальная копия */
export async function removeSaved(id: number): Promise<void> {
  const db = await readyDb();
  await db.runAsync('DELETE FROM favorites WHERE id = ?', id);
}
