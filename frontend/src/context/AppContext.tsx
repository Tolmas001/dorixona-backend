import { createContext, useContext } from 'react';
import type { Advertisement, AuditLog, AuthState, BillingPlan, CartLine, DashboardStats, OnlineOrder, Pharmacy, PharmacySubscription, PlatformSettings, Product, ProfitReport, Sale, ShiftReport, User } from '../types';
import type { Page } from '../app/navigation';

export interface AppState {
  auth: AuthState | null;
  page: Page;
  products: Product[];
  orders: OnlineOrder[];
  sales: Sale[];
  stats: DashboardStats | null;
  users: User[];
  pharmacies: Pharmacy[];
  billingPlans: BillingPlan[];
  subscriptions: PharmacySubscription[];
  advertisements: Advertisement[];
  platformSettings: PlatformSettings;
  auditLogs: AuditLog[];
  profitReport: ProfitReport | null;
  shiftReport: ShiftReport | null;
  cart: CartLine[];
  favorites: string[];
  query: string;
  category: string;
  selectedProduct: Product | null;
  status: string;
  sidebarOpen: boolean;
  cartNotice: string;
}

export interface AppActions {
  setAuth: (auth: AuthState | null) => void;
  setPage: (page: Page) => void;
  setProducts: (products: Product[]) => void;
  setOrders: (orders: OnlineOrder[]) => void;
  setSales: (sales: Sale[]) => void;
  setStats: (stats: DashboardStats | null) => void;
  setUsers: (users: User[]) => void;
  setPharmacies: (pharmacies: Pharmacy[]) => void;
  setBillingPlans: (plans: BillingPlan[]) => void;
  setSubscriptions: (subscriptions: PharmacySubscription[]) => void;
  setAdvertisements: (ads: Advertisement[]) => void;
  setPlatformSettings: (settings: PlatformSettings) => void;
  setAuditLogs: (logs: AuditLog[]) => void;
  setProfitReport: (report: ProfitReport | null) => void;
  setShiftReport: (report: ShiftReport | null) => void;
  setCart: (cart: CartLine[] | ((prev: CartLine[]) => CartLine[])) => void;
  setFavorites: (favorites: string[] | ((prev: string[]) => string[])) => void;
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  setStatus: (status: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setCartNotice: (notice: string) => void;
  loadPublicData: () => Promise<void>;
  loadPrivateData: (role?: string) => Promise<void>;
  logout: () => void;
  addToCart: (product: Product) => void;
  go: (page: Page) => void;
}

export type AppContextType = AppState & AppActions;

export const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}