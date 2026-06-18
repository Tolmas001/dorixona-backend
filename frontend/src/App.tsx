import { ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api/client';
import {
  AdminDashboard,
  AdminOrders,
  AuthPage,
  CartPage,
  CashierPage,
  CatalogPage,
  CustomerOrders,
  Header,
  HomePage,
  InventoryPage,
  ProductDetail,
  ProductsAdmin,
  ProfilePage,
  PrescriptionPage,
  Sidebar,
  SuperAdminPage,
} from './pages/AppPages';
import type { Advertisement, AuditLog, AuthState, BillingPlan, CartLine, DashboardStats, OnlineOrder, Pharmacy, PharmacySubscription, PlatformSettings, Product, ProfitReport, Sale, ShiftReport, User } from './types';
import { isAdminRole, productCategory, productPrice } from './utils/format';
import { clearAuth, readAuth } from './utils/storage';
import { go, routePage, type Page } from './app/navigation';

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => readAuth());
  const [page, setPage] = useState<Page>(() => routePage());
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PharmacySubscription[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('dorixona_favorites') || '[]') as string[]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Barchasi');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState('Backenddan maʼlumotlar yuklanmoqda...');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState('');

  useEffect(() => {
    const onRoute = () => setPage(routePage());
    window.addEventListener('popstate', onRoute);
    return () => window.removeEventListener('popstate', onRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem('dorixona_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.removeItem('dorixona_theme');
    delete document.documentElement.dataset.theme;
    document.body.classList.remove('theme-dark');
  }, []);

  useEffect(() => {
    loadPublicData();
    if (auth) loadPrivateData(auth.user.role);
  }, [auth]);

  async function loadPublicData() {
    try {
      const [nextProducts, nextAds, nextSettings] = await Promise.all([
        api.products(),
        api.advertisements(true).catch(() => []),
        api.platformSettings().catch(() => ({})),
      ]);
      setProducts(nextProducts);
      setAdvertisements(nextAds);
      setPlatformSettings(nextSettings);
      setStatus('Mahsulotlar backenddan yuklandi');
    } catch (error) {
      setProducts([]);
      setStatus(error instanceof ApiError ? error.message : 'Backend ulanmagan');
    }
  }

  async function loadPrivateData(role?: string) {
    const tasks: Array<Promise<unknown>> = [];
    const user = auth?.user;
    const pharmacyId = user?.pharmacy_id || user?.pharmacyId || null;
    if (isAdminRole(role)) {
      tasks.push(api.dashboard().then(setStats).catch(() => null));
      tasks.push(api.sales().then(setSales).catch(() => null));
      tasks.push(api.onlineOrders().then(setOrders).catch(() => null));
      tasks.push(api.billingPlans().then(setBillingPlans).catch(() => null));
      tasks.push(api.advertisements(false).then(setAdvertisements).catch(() => null));
      tasks.push(api.auditLogs().then(setAuditLogs).catch(() => null));
      if (pharmacyId && role !== 'SUPER_ADMIN') {
        tasks.push(api.profitReport().then(setProfitReport).catch(() => null));
        tasks.push(api.shiftReport().then(setShiftReport).catch(() => null));
      } else {
        setProfitReport(null);
        setShiftReport(null);
      }
    }
    if (role === 'SUPER_ADMIN') {
      tasks.push(api.superUsers().then(setUsers).catch(() => null));
      tasks.push(api.superPharmacies().then(setPharmacies).catch(() => null));
      tasks.push(api.subscriptions().then(setSubscriptions).catch(() => null));
      tasks.push(api.globalStats().then((data) => setStats((old) => ({ ...old, ...data }))).catch(() => null));
    }
    await Promise.all(tasks);
  }

  function logout() {
    clearAuth();
    setAuth(null);
    go('home');
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
    setCartNotice(`${product.name} savatga qo‘shildi`);
    window.setTimeout(() => setCartNotice(''), 2200);
  }

  const categories = useMemo(() => ['Barchasi', ...new Set(products.map(productCategory))], [products]);
  const visibleProducts = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return products.filter((product) => {
      const text = `${product.name} ${product.barcode || ''} ${product.sku || ''} ${productCategory(product)}`.toLowerCase();
      return (category === 'Barchasi' || productCategory(product) === category) && (!normalized || text.includes(normalized));
    });
  }, [category, products, query]);
  const cartTotal = cart.reduce((sum, item) => sum + productPrice(item.product) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!auth && ['admin', 'cashier', 'adminProducts', 'inventory', 'adminOrders', 'super', 'profile', 'orders'].includes(page)) {
    return <AuthPage onAuth={setAuth} />;
  }

  return (
    <div className="app">
      <Header
        auth={auth}
        cartCount={cartCount}
        products={products}
        showMenu={Boolean(auth && isAdminRole(auth.user.role))}
        onLogout={logout}
        onMenu={() => setSidebarOpen(true)}
        onSearch={(value) => {
          setQuery(value);
          go('catalog');
        }}
      />
      <div className={auth && isAdminRole(auth.user.role) ? 'shell' : 'shell no-sidebar'}>
        {auth && isAdminRole(auth.user.role) && (
          <Sidebar
            auth={auth}
            open={sidebarOpen}
            page={page}
            onClose={() => setSidebarOpen(false)}
            onGo={(next) => {
              setSidebarOpen(false);
              go(next);
            }}
          />
        )}
        <main className="main">
          {page === 'home' && (
            <HomePage
              products={products}
              advertisements={advertisements}
              platformSettings={platformSettings}
              onAdd={addToCart}
              onOpen={(product) => {
                setSelectedProduct(product);
                go('product');
              }}
              onSearch={(value) => {
                setQuery(value);
                go('catalog');
              }}
            />
          )}
          {page === 'catalog' && (
            <CatalogPage
              categories={categories}
              category={category}
              favorites={favorites}
              products={visibleProducts}
              query={query}
              status={status}
              onAdd={addToCart}
              onCategory={setCategory}
              onFavorite={(product) => setFavorites((list) => list.includes(product.id) ? list.filter((id) => id !== product.id) : [product.id, ...list])}
              onOpen={(product) => {
                setSelectedProduct(product);
                go('product');
              }}
              onQuery={setQuery}
            />
          )}
          {page === 'product' && <ProductDetail product={selectedProduct || products[0]} onAdd={addToCart} />}
          {page === 'cart' && <CartPage auth={auth} cart={cart} setCart={setCart} total={cartTotal} onOrdered={() => loadPrivateData(auth?.user.role)} />}
          {page === 'orders' && <CustomerOrders orders={orders} products={products} onAdd={addToCart} />}
          {page === 'prescription' && <PrescriptionPage />}
          {page === 'profile' && (
            <ProfilePage
              auth={auth}
              favorites={favorites}
              orders={orders}
              products={products}
              onAdd={addToCart}
              onAuth={setAuth}
              onFavorite={(product) => setFavorites((list) => list.includes(product.id) ? list.filter((id) => id !== product.id) : [product.id, ...list])}
              onLogout={logout}
              onOpen={(product) => {
                setSelectedProduct(product);
                go('product');
              }}
            />
          )}
          {page === 'admin' && <AdminDashboard auditLogs={auditLogs} profitReport={profitReport} shiftReport={shiftReport} stats={stats} products={products} orders={orders} sales={sales} onRefresh={() => {
            loadPublicData();
            loadPrivateData(auth?.user.role);
          }} />}
          {page === 'cashier' && <CashierPage products={products} onSold={() => {
            loadPublicData();
            loadPrivateData(auth?.user.role);
          }} />}
          {page === 'adminProducts' && <ProductsAdmin products={products} onReload={loadPublicData} />}
          {page === 'inventory' && <InventoryPage products={products} onUpdated={loadPublicData} />}
          {page === 'adminOrders' && <AdminOrders orders={orders} onReload={() => loadPrivateData(auth?.user.role)} />}
          {page === 'super' && <SuperAdminPage advertisements={advertisements} auditLogs={auditLogs} billingPlans={billingPlans} platformSettings={platformSettings} subscriptions={subscriptions} users={users} pharmacies={pharmacies} products={products} orders={orders} sales={sales} stats={stats} onReload={() => {
            loadPublicData();
            loadPrivateData('SUPER_ADMIN');
          }} />}
        </main>
      </div>
      {cartNotice && <div className="toast cart-toast"><ShoppingBag size={18} /> {cartNotice}</div>}
    </div>
  );
}
