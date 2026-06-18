import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
};

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, ARGON2_OPTIONS);
};

export const verifyPassword = async (
  hash: string,
  password: string,
): Promise<boolean> => {
  return argon2.verify(hash, password, ARGON2_OPTIONS);
};
