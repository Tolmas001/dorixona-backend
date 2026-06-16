import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/services/password';

describe('password service', () => {
  it('hashes and verifies a password with argon2id', async () => {
    const password = 'SuperSecure123!';
    const hash = await hashPassword(password);

    expect(hash).toContain('$argon2id$');
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });
});
