import { describe, expect, it } from 'vitest';
import { buildProductWhere, buildStockWhere } from '../src/routes/products/shared';

describe('product pharmacy scoping', () => {
  it('does not widen product scope when a non-super-admin user has no pharmacy', () => {
    expect(buildProductWhere('ADMIN', null)).toEqual({ id: { in: [] } });
    expect(buildProductWhere('SELLER', undefined)).toEqual({ id: { in: [] } });
  });

  it('does not include stocks when a non-super-admin user has no pharmacy', () => {
    expect(buildStockWhere('OWNER', null)).toEqual({ id: { in: [] } });
    expect(buildStockWhere('ADMIN', undefined)).toEqual({ id: { in: [] } });
  });

  it('keeps super-admin product and stock scope unrestricted', () => {
    expect(buildProductWhere('SUPER_ADMIN', null)).toEqual({});
    expect(buildStockWhere('SUPER_ADMIN', null)).toBeUndefined();
  });

  it('scopes regular product and stock queries to the user pharmacy', () => {
    const pharmacyId = '9cfa2aa3-1c5c-4f70-a5eb-6e7cbf31a4f9';

    expect(buildProductWhere('OWNER', pharmacyId)).toEqual({
      stocks: { some: { pharmacyId } },
    });
    expect(buildStockWhere('OWNER', pharmacyId)).toEqual({ pharmacyId });
  });
});
