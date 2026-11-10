import * as SQLite from 'expo-sqlite';

/** Строка таблицы аккаунтов. Пароля в ней нет — только его хэш и соль */
export type AccountRow = {
  /** uid пользователя: по нему у каждого аккаунта свои данные, например фото профиля */
  id: string;
  /** в нижнем регистре: «Name@Mail.com» и «name@mail.com» — один аккаунт */
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

/** То, что о вошедшем пользователе нужно экранам */
export type Account = Pick<AccountRow, 'id' | 'email' | 'name'>;

let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/** База отдаётся только после создания таблицы; неудачное открытие не кэшируется, чтобы следующая операция попробовала снова */
function readyDb(): Promise<SQLite.SQLiteDatabase> {
  if (!connection) {
    connection = (async () => {
      const db = await SQLite.openDatabaseAsync('greenroute_accounts.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY NOT NULL,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          passwordHash TEXT NOT NULL,
          salt TEXT NOT NULL,
          createdAt TEXT NOT NULL
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

/** CREATE: 1 — аккаунт создан, 0 — такой email уже зарегистрирован */
export async function insertAccount(account: AccountRow): Promise<number> {
  const db = await readyDb();
  const result = await db.runAsync(
    `INSERT INTO accounts
       (id, email, name, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`,
    account.id,
    account.email,
    account.name,
    account.passwordHash,
    account.salt,
    account.createdAt,
  );
  return result.changes;
}

/** READ для входа: вместе с хэшем и солью, чтобы проверить пароль */
export async function findAccountByEmail(email: string): Promise<AccountRow | null> {
  const db = await readyDb();
  return db.getFirstAsync<AccountRow>(
    'SELECT id, email, name, passwordHash, salt, createdAt FROM accounts WHERE email = ?',
    email,
  );
}

/** READ для восстановления входа после перезапуска — без хэша пароля */
export async function getAccount(id: string): Promise<Account | null> {
  const db = await readyDb();
  return db.getFirstAsync<Account>('SELECT id, email, name FROM accounts WHERE id = ?', id);
}

/** UPDATE: новое имя профиля */
export async function renameAccount(id: string, name: string): Promise<void> {
  const db = await readyDb();
  await db.runAsync('UPDATE accounts SET name = ? WHERE id = ?', name, id);
}
