import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { findAccountByEmail, getAccount, insertAccount, renameAccount, type Account } from '@/database/accounts';
import { AuthError } from '@/lib/authErrors';
import { createSalt, hashPassword } from '@/lib/password';

/** uid вошедшего аккаунта: после перезапуска пользователь остаётся в аккаунте */
const SESSION_KEY = 'greenroute/session/v1';

/** Вошедший пользователь — только то, что нужно экранам */
export type AuthUser = {
  /** по uid у каждого аккаунта свои ключи данных, например фото профиля */
  uid: string;
  email: string;
  name: string;
};

/** loading — ещё читаем, кто входил в прошлый раз */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type State = { status: AuthStatus; user: AuthUser | null };

type AuthContextValue = State & {
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
};

const SIGNED_OUT: State = { status: 'signedOut', user: null };

const signedIn = ({ id, email, name }: Account): State => ({ status: 'signedIn', user: { uid: id, email, name } });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading', user: null });

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await AsyncStorage.getItem(SESSION_KEY);
      const account = uid ? await getAccount(uid) : null;
      // Аккаунта с сохранённым uid уже нет (например, данные приложения очистили) — забываем вход
      if (uid && !account) await AsyncStorage.removeItem(SESSION_KEY);
      if (active) setState(account ? signedIn(account) : SIGNED_OUT);
    })().catch((error) => {
      console.error(error);
      if (active) setState(SIGNED_OUT);
    });
    return () => {
      active = false;
    };
  }, []);

  const uid = state.user?.uid;
  const actions = useMemo(
    () => ({
      async signUp(name: string, email: string, password: string) {
        const salt = createSalt();
        const account = {
          id: Crypto.randomUUID(),
          email: normalizeEmail(email),
          name,
          passwordHash: await hashPassword(password, salt),
          salt,
          createdAt: new Date().toISOString(),
        };
        if ((await insertAccount(account)) === 0) throw new AuthError('email-in-use');
        await AsyncStorage.setItem(SESSION_KEY, account.id);
        setState(signedIn(account));
      },
      async signIn(email: string, password: string) {
        const account = await findAccountByEmail(normalizeEmail(email));
        // Одна ошибка и для неизвестного email, и для неверного пароля: форма не подсказывает, какие email зарегистрированы
        if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
          throw new AuthError('wrong-credentials');
        }
        await AsyncStorage.setItem(SESSION_KEY, account.id);
        setState(signedIn(account));
      },
      async signOut() {
        await AsyncStorage.removeItem(SESSION_KEY);
        setState(SIGNED_OUT);
      },
      async updateName(name: string) {
        if (!uid) return;
        await renameAccount(uid, name);
        setState((prev) => (prev.user ? { ...prev, user: { ...prev.user, name } } : prev));
      },
    }),
    [uid],
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth должен вызываться внутри AuthProvider');
  return value;
}

/** Для частей экрана, которые показываются только вошедшему пользователю */
export function useCurrentUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser вызван без вошедшего пользователя');
  return user;
}
