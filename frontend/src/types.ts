export type Role = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'SELLER' | 'CUSTOMER' | string;

export type User = {
  id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  name?: string;
  tel_number?: string;
  delivery_address?: string | null;
  age?: number;
  isBlocked?: boolean;
  role?: Role;
  pharmacy_id?: string | null;
  pharmacyId?: string | null;
  pharmacy?: Pharmacy | null;
  createdAt?: string;
  created_at?: string;
};

export type AuthState = {
  token: string;
  refreshToken?: string;
  user: User;
};

export type Pharmacy = {
  id?: string;
  name?: string;
  licenseNumber?: string;
  address?: string | null;
  phone?: string | null;
  isBlocked?: boolean;
  users?: User[];
  subscriptions?: PharmacySubscription[];
  _count?: { users?: number; sales?: number; stocks?: number };
};

export type BillingPlan = {
  id?: string;
  name?: string;
  code?: string;
  description?: string | null;
  price?: number | string;
  billingInterval?: 'MONTHLY' | 'YEARLY' | string;
  maxUsers?: number | null;
  maxPharmacies?: number | null;
  isActive?: boolean;
};

export type PharmacySubscription = {
  id?: string;
  pharmacyId?: string;
  planId?: string;
  status?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL' | string;
  startsAt?: string;
  endsAt?: string | null;
  autoRenew?: boolean;
  pharmacy?: Pharmacy;
  plan?: BillingPlan;
};

export type Advertisement = {
  id?: string;
  title: string;
  text?: string | null;
  imageUrl?: string | null;
  targetUrl?: string | null;
  placement?: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PlatformSettings = {
  siteName?: string;
  supportPhone?: string;
  telegram?: string;
  instagram?: string;
  minimalStockWarning?: string;
  prescriptionKeywords?: string;
  [key: string]: string | undefined;
};

export type AuditLog = {
  id?: string;
  action?: string;
  entityType?: string;
  entityId?: string | null;
  metadata?: unknown;
  createdAt?: string;
  actor?: User | null;
  pharmacy?: Pharmacy | null;
};

export type ProfitReport = {
  revenue?: number;
  cost?: number;
  profit?: number;
  totalSales?: number;
  pharmacyId?: string;
};

export type ShiftReport = {
  pharmacyId?: string;
  sellerId?: string;
  totalSales?: number;
  totalRevenue?: number;
  totalItemsSold?: number;
};

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  purchasePrice?: number | string;
  sellingPrice?: number | string;
  price?: number | string;
  expiryDate?: string;
  manufacturer?: string | null;
  totalQuantity?: number | string;
  quantity?: number | string;
  stockBatches?: Stock[];
  stocks?: Stock[];
};

export type Stock = {
  id?: string;
  productId?: string;
  pharmacyId?: string;
  batchNumber?: string;
  quantity?: number | string;
  reorderLevel?: number | string;
  expiryDate?: string;
  product?: Product;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type OnlineOrder = {
  id?: string;
  customerName?: string;
  customerPhone?: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  totalAmount?: number | string;
  items?: unknown;
  createdAt?: string;
  deliveryAddress?: string | null;
  delivery_address?: string | null;
  paymentMethod?: string | null;
  payment_method?: string | null;
  paymentStatus?: string | null;
  payment_status?: string | null;
  deliveryMethod?: string | null;
  delivery_method?: string | null;
  notes?: string | null;
  pharmacy?: Pharmacy | null;
};

export type Sale = {
  id?: string;
  totalAmount?: number | string;
  paymentType?: string;
  discountPercent?: number | string;
  soldAt?: string;
  items?: Array<{ quantity?: number | string; product?: Product }>;
  seller?: User;
};

export type DashboardStats = {
  totalRevenueToday?: number;
  salesCountToday?: number;
  totalItemsSoldToday?: number;
  averageCheckToday?: number;
  grossProfitToday?: number;
  inventoryValue?: number;
  inventoryRetailValue?: number;
  lowStockCount?: number;
  activeOrders?: number;
  pendingOrders?: number;
  approvedOrders?: number;
  rejectedOrders?: number;
  totalOnlineOrders?: number;
  productsCount?: number;
  expiringSoon?: Stock[];
  paymentBreakdown?: Record<string, number>;
  topProductsToday?: Array<{ productId?: string; name?: string; quantity?: number; revenue?: number }>;
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
};
