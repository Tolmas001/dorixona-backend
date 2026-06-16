import type { Advertisement } from '../types';

export const PRODUCT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80';

export const ADMIN_NAV = [
  ['admin', 'Dashboard', 'LayoutDashboard'],
  ['cashier', 'Kassa', 'ShoppingCart'],
  ['adminProducts', 'Mahsulotlar', 'PackageSearch'],
  ['inventory', 'Ombor', 'Boxes'],
  ['adminOrders', 'Online buyurtmalar', 'Bell'],
  ['super', 'Super admin', 'ShieldCheck'],
] as const;

export const DEFAULT_ADS: Advertisement[] = [
  {
    title: 'Vitaminlar haftaligi',
    text: 'Immunitet uchun eng ko‘p so‘ralgan mahsulotlar. Buyurtmani admin tez tasdiqlaydi.',
    targetUrl: null,
    imageUrl: null,
    placement: 'HOME_HERO',
    isActive: true,
  },
  {
    title: 'Retseptli dorilar nazoratda',
    text: 'Antibiotik va retsept talab qiladigan dorilar faqat tekshiruvdan keyin beriladi.',
    targetUrl: null,
    imageUrl: null,
    placement: 'HOME_HERO',
    isActive: true,
  },
  {
    title: 'Tezkor yetkazish',
    text: 'Savatni yuboring, dorixona admini buyurtmani ko‘rib chiqadi.',
    targetUrl: null,
    imageUrl: null,
    placement: 'HOME_HERO',
    isActive: true,
  },
];

export const PROFILE_MENU = [
  ['dashboard', 'Dashboard', 'LayoutDashboard'],
  ['orders', 'Mening Buyurtmalarim', 'ShoppingBag'],
  ['favorites', 'Sevimli Mahsulotlar', 'Heart'],
  ['prescriptions', 'Retseptlarim', 'FileUp'],
  ['addresses', 'Manzillarim', 'Building2'],
  ['payments', 'To‘lov Usullari', 'CreditCard'],
  ['bonus', 'Bonus Ballar', 'Star'],
  ['security', 'Xavfsizlik', 'Lock'],
  ['notifications', 'Bildirishnomalar', 'Bell'],
  ['settings', 'Sozlamalar', 'UserCog'],
] as const;

export const ORDER_FILTERS = [
  ['all', 'All Orders'],
  ['active', 'Active Orders'],
  ['delivered', 'Delivered Orders'],
  ['prescription', 'Prescription Orders'],
  ['cancelled', 'Cancelled Orders'],
] as const;

export const ORDER_TIMELINE_STEPS = ['Order Confirmed', 'Payment Received', 'Preparing Order', 'Out For Delivery', 'Delivered'];
export const ORDER_STATUS_ORDER = ['PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export const POPULAR_TAGS = ['Paracetamol', 'Vitamin C', 'Antibiotik', 'Ko‘z tomchisi'];
export const SYMPTOM_TAGS = ['Bosh og‘rig‘i', 'Yo‘tal', 'Oshqozon', 'Vitamin yetishmasligi'];
export const CATEGORY_TAGS = ['Dorilar', 'Antibiotiklar', 'Vitaminlar', 'Ko‘z tomchilari', 'Sirop', 'Bolalar dorisi'];