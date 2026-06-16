import { describe, expect, it, vi } from 'vitest';
import { generateTokens } from '../src/services/tokens';

describe('generateTokens', () => {
  it('creates access and refresh tokens and stores the refresh hash', async () => {
    const update = vi.fn().mockResolvedValue({});
    const sign = vi
      .fn()
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await generateTokens(
      {
        jwt: { sign },
        prisma: { user: { update } },
      } as never,
      {
        userId: 'user-1',
        role: 'CUSTOMER',
        pharmacyId: null,
      },
    );

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(sign).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1', role: 'CUSTOMER', pharmacyId: null },
      { expiresIn: '30m' },
    );
    expect(sign).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1', role: 'CUSTOMER', pharmacyId: null },
      { expiresIn: '7d' },
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        refresh_token_hash: expect.any(String),
      },
    });
  });
});
