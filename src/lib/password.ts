import * as Crypto from 'expo-crypto';

/** Случайная соль для каждого аккаунта: одинаковые пароли дают разные хэши */
export function createSalt(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 от соли и пароля — сам пароль нигде не сохраняется.
 * Для аккаунтов на устройстве этого достаточно; на сервере пароли хранят через медленные функции (bcrypt, Argon2)
 */
export function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}
