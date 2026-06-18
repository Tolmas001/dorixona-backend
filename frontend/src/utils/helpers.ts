import type { OnlineOrder, Product } from '../types';
import { productPrice, productStock } from './format';

export type OrderLine = {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl?: string | null;
  prescription?: boolean;
};

export function getOrderItems(order: OnlineOrder, products: Product[]): OrderLine[] {
  if (!Array.isArray(order.items)) return [];
  return order.items.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const productId = String(item.productId || item.product_id || item.id || '');
    const product = products.find((candidate) => candidate.id === productId);
    const name = String(item.name || product?.name || `Mahsulot ${index + 1}`);
    const price = Number(item.price || item.unitPrice || (product ? productPrice(product) : 0));
    const quantity = Number(item.quantity || 1);
    return {
      productId: productId || product?.id,
      name,
      quantity,
      price,
      total: Number(item.total || price * quantity),
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : product?.imageUrl || null,
      prescription: !!product?.name?.toLowerCase().includes('antibiotik'),
    };
  });
}

export function getDeliveryAddress(order: OnlineOrder): string {
  return order.deliveryAddress || order.delivery_address || order.pharmacy?.address || 'Manzil backenddan kelmagan';
}

export function getDeliveryMethod(order: OnlineOrder): string {
  return order.deliveryMethod || order.delivery_method || 'Admin tasdiqlaydi';
}

export function getPaymentLabel(order: OnlineOrder): string {
  const method = order.paymentMethod || order.payment_method;
  const status = order.paymentStatus || order.payment_status;
  if (method && status) return `Payment: ${method} · ${status}`;
  if (method) return `Payment: ${method}`;
  if (status) return `Payment: ${status}`;
  return 'Payment: Admin tasdiqlaydi';
}

export function getStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['DELIVERED', 'APPROVED'].includes(status)) return 'success';
  if (['CANCELLED', 'REJECTED'].includes(status)) return 'danger';
  if (['SHIPPED', 'REFUNDED'].includes(status)) return 'neutral';
  return 'warning';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Processing',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REJECTED: 'Cancelled',
    REFUNDED: 'Refunded',
  };
  return labels[status] || status;
}

export function getOrderTimelineIndex(status: string): number {
  return ['PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].indexOf(status);
}

export function isOrderActive(status: string): boolean {
  return ['PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED'].includes(status);
}

export function isOrderDelivered(status: string): boolean {
  return ['DELIVERED', 'APPROVED'].includes(status);
}

export function isOrderPending(status: string): boolean {
  return status === 'PENDING';
}

export function getStatNumber(stats: Record<string, unknown> | null, key: string, fallback = 0): number {
  const value = stats?.[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function getStatRecord(stats: Record<string, unknown> | null, key: string): Record<string, number> {
  const value = stats?.[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([entryKey, entryValue]) => [entryKey, Number(entryValue)])
      .filter(([, entryValue]) => Number.isFinite(entryValue)),
  );
}

export function getStatArray<T>(stats: Record<string, unknown> | null, key: string): T[] {
  const value = stats?.[key];
  return Array.isArray(value) ? value as T[] : [];
}

export function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getActiveOrderStatuses(): string[] {
  return ['PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED'];
}

export function getDeliveredOrderStatuses(): string[] {
  return ['DELIVERED', 'APPROVED'];
}