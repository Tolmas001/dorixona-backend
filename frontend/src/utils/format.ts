import type { Product, User } from '../types';

export function money(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat('uz-UZ').format(Number(value) || 0)} so'm`;
}

export function productPrice(product: Product): number {
  return Number(product.sellingPrice ?? product.price ?? 0);
}

export function productStock(product: Product): number {
  const batches = product.stockBatches ?? product.stocks ?? [];
  return Number(product.totalQuantity ?? product.quantity ?? batches.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0));
}

export function productCategory(product: Product): string {
  return product.manufacturer || product.sku || 'Dorilar';
}

export function displayName(user?: User | null): string {
  return user?.full_name || user?.name || user?.username || user?.email || 'Foydalanuvchi';
}

export function isAdminRole(role?: string): boolean {
  return ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'SELLER'].includes(role || '');
}

export function isPrescription(product: Product): boolean {
  return /antibiotik|amox|amoks|retsept|cef|azitro/i.test(`${product.name} ${product.manufacturer || ''} ${product.sku || ''}`);
}

export function assetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/server/')) return url;
  if (url.startsWith('/uploads/')) return `/server${url}`;
  return url;
}
