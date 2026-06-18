import { Activity, Badge as BadgeIcon, BarChart3, Bell, Boxes, PackagePlus, ShieldCheck, ShoppingCart, TrendingUp } from 'lucide-react';
import { Badge, Button, Card } from '../components/Ui';
import { go } from '../app/navigation';
import { money, productCategory, productPrice, productStock } from '../utils/format';
import { isAdminRole, isPrescription } from '../utils/format';
import type { AuditLog, DashboardStats, OnlineOrder, Product, ProfitReport, Sale, ShiftReport } from '../types';

function statNumber(stats: DashboardStats | null, key: string, fallback = 0): number {
  const value = stats?.[key as keyof DashboardStats];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function statRecord(stats: DashboardStats | null, key: string): Record<string, number> {
  const value = stats?.[key as keyof DashboardStats];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([entryKey, entryValue]) => [entryKey, Number(entryValue)])
      .filter(([, entryValue]) => Number.isFinite(entryValue)),
  );
}

function statArray<T>(stats: DashboardStats | null, key: string): T[] {
  const value = stats?.[key as keyof DashboardStats];
  return Array.isArray(value) ? value as T[] : [];
}

function Metric({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="metric">
      <div><span>{label}</span><strong>{value}</strong></div>
      <i><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function SimpleList({ title, rows, empty }: { title: string; rows: Array<Array<React.ReactNode>>; empty: string }) {
  return (
    <Card>
      <h2 className="card-title">{title}</h2>
      <div className="table-like">
        {rows.map((row, index) => <div className="table-row" key={index}>{row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}
        {!rows.length && <p className="status-text">{empty}</p>}
      </div>
    </Card>
  );
}

export function AdminDashboard({
  auditLogs,
  profitReport,
  shiftReport,
  stats,
  products,
  orders,
  sales,
  onRefresh,
}: {
  auditLogs: AuditLog[];
  profitReport: ProfitReport | null;
  shiftReport: ShiftReport | null;
  stats: DashboardStats | null;
  products: Product[];
  orders: OnlineOrder[];
  sales: Sale[];
  onRefresh: () => void;
}) {
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const pendingOrders = statNumber(stats, 'pendingOrders', orders.filter((order) => order.status === 'PENDING').length);
  const approvedOrders = statNumber(stats, 'approvedOrders', orders.filter((order) => order.status === 'APPROVED').length);
  const activeOrders = statNumber(stats, 'activeOrders', pendingOrders + approvedOrders);
  const lowStock = products.filter((product) => productStock(product) <= 20);
  const prescriptionProducts = products.filter(isPrescription);
  const totalRevenueToday = statNumber(stats, 'totalRevenueToday', revenue);
  const grossProfitToday = statNumber(stats, 'grossProfitToday');
  const salesCountToday = statNumber(stats, 'salesCountToday', sales.length);
  const totalItemsSoldToday = statNumber(stats, 'totalItemsSoldToday');
  const averageCheckToday = statNumber(stats, 'averageCheckToday');
  const inventoryValue = statNumber(stats, 'inventoryValue');
  const inventoryRetailValue = statNumber(stats, 'inventoryRetailValue');
  const productsCount = statNumber(stats, 'productsCount', products.length);
  const totalOnlineOrders = statNumber(stats, 'totalOnlineOrders', orders.length);
  const rejectedOrders = statNumber(stats, 'rejectedOrders', orders.filter((order) => order.status === 'REJECTED').length);
  const paymentBreakdown = statRecord(stats, 'paymentBreakdown');
  const topProductsToday = statArray<{ productId?: string; name?: string; quantity?: number; revenue?: number }>(stats, 'topProductsToday');
  const expiringSoon = Array.isArray(stats?.expiringSoon) ? stats.expiringSoon : [];
  const cards = [
    ['Bugungi tushum', money(totalRevenueToday), BarChart3, '+ real-time'],
    ['Yalpi foyda', money(grossProfitToday || profitReport?.profit || 0), TrendingUp, 'ERP profit'],
    ['Online buyurtma', totalOnlineOrders, Bell, `${activeOrders} aktiv`],
    ['Ombor qiymati', money(inventoryValue), Boxes, `${productsCount} mahsulot`],
  ] as const;
  return (
    <div className="page erp-dashboard">
      <section className="erp-hero">
        <div>
          <Badge tone="success"><Activity size={14} /> ERP nazorat markazi</Badge>
          <h1>Dorixona operatsion paneli</h1>
          <p>Savdo, ombor, buyurtmalar, foyda va audit ko‘rsatkichlari backend bazadan olinadi.</p>
        </div>
        <div className="erp-hero-actions">
          <Button onClick={onRefresh} variant="secondary"><Activity size={18} /> Yangilash</Button>
          <Button onClick={() => go('cashier')}><ShoppingCart size={18} /> Kassa</Button>
          <Button onClick={() => go('adminProducts')} variant="secondary"><PackagePlus size={18} /> Mahsulot</Button>
          <Button onClick={() => go('inventory')} variant="secondary"><Boxes size={18} /> Ombor</Button>
        </div>
      </section>

      <div className="stat-grid erp-kpis">
        {cards.map(([label, value, Icon, hint]) => (
          <Card className="stat erp-kpi" key={label}>
            <div><Icon size={22} /><Badge tone="neutral">{hint}</Badge></div>
            <span>{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>

      <section className="erp-board">
        <Card className="report-card erp-panel">
          <div className="report-head"><TrendingUp /><div><h3>Savdo va moliya</h3><p>Bugungi POS va tasdiqlangan savdo oqimi</p></div></div>
          <div className="erp-mini-grid">
            <article><span>Cheklar</span><b>{salesCountToday}</b></article>
            <article><span>Sotilgan dona</span><b>{totalItemsSoldToday}</b></article>
            <article><span>O‘rtacha chek</span><b>{money(averageCheckToday)}</b></article>
            <article><span>Smena tushumi</span><b>{money(shiftReport?.totalRevenue || totalRevenueToday)}</b></article>
          </div>
          <div className="metric-bars">
            <Metric label="Bugungi tushum" value={totalRevenueToday} max={Math.max(totalRevenueToday, inventoryRetailValue, 1)} />
            <Metric label="Yalpi foyda" value={grossProfitToday || Number(profitReport?.profit || 0)} max={Math.max(totalRevenueToday, 1)} />
            <Metric label="Xarajat" value={Number(profitReport?.cost || Math.max(0, totalRevenueToday - grossProfitToday))} max={Math.max(totalRevenueToday, 1)} />
          </div>
        </Card>

        <Card className="report-card erp-panel">
          <div className="report-head"><Boxes /><div><h3>Ombor boshqaruvi</h3><p>Qoldiq, yaroqlilik va kapital nazorati</p></div></div>
          <div className="erp-mini-grid">
            <article><span>Mahsulot turi</span><b>{productsCount}</b></article>
            <article><span>Mavjud qoldiq</span><b>{products.reduce((sum, p) => sum + productStock(p), 0)}</b></article>
            <article><span>Kam qoldiq</span><b>{stats?.lowStockCount ?? lowStock.length}</b></article>
            <article><span>30 kunda muddati</span><b>{expiringSoon.length}</b></article>
          </div>
          <div className="metric-bars">
            <Metric label="Ombor tannarxi" value={inventoryValue} max={Math.max(inventoryRetailValue, inventoryValue, 1)} />
            <Metric label="Sotuv qiymati" value={inventoryRetailValue} max={Math.max(inventoryRetailValue, 1)} />
            <Metric label="Retseptli dorilar" value={prescriptionProducts.length} max={Math.max(productsCount, 1)} />
          </div>
        </Card>

        <Card className="report-card erp-panel">
          <div className="report-head"><Bell /><div><h3>Online buyurtmalar</h3><p>Admin tasdiqlashi kerak bo‘lgan buyurtmalar</p></div></div>
          <div className="erp-status-grid">
            <button onClick={() => go('adminOrders')} type="button"><span>Kutilmoqda</span><b>{pendingOrders}</b></button>
            <button onClick={() => go('adminOrders')} type="button"><span>Tasdiqlangan</span><b>{approvedOrders}</b></button>
            <button onClick={() => go('adminOrders')} type="button"><span>Bekor qilingan</span><b>{rejectedOrders}</b></button>
            <button onClick={() => go('adminOrders')} type="button"><span>Jami online</span><b>{totalOnlineOrders}</b></button>
          </div>
          <div className="metric-bars">
            <Metric label="Aktiv buyurtmalar" value={activeOrders} max={Math.max(totalOnlineOrders, 1)} />
            <Metric label="Tasdiqlash navbati" value={pendingOrders} max={Math.max(totalOnlineOrders, 1)} />
          </div>
        </Card>
      </section>

      <section className="dashboard-split">
        <SimpleList
          title="To‘lov turlari"
          rows={Object.entries(paymentBreakdown).map(([type, amount]) => [type, money(amount)])}
          empty="Bugun to‘lov bo‘yicha savdo yo‘q"
        />
        <SimpleList
          title="Bugungi top mahsulotlar"
          rows={topProductsToday.map((item) => [item.name || '-', `${item.quantity || 0} dona`, money(item.revenue || 0)])}
          empty="Bugun sotilgan mahsulot yo‘q"
        />
      </section>

      <section className="dashboard-split">
        <SimpleList title="Kam qolgan dorilar" rows={lowStock.slice(0, 8).map((p) => [p.name, productCategory(p), `${productStock(p)} dona`, money(productPrice(p))])} empty="Kam qolgan dori yo‘q" />
        <SimpleList title="Oxirgi online buyurtmalar" rows={orders.slice(0, 8).map((o) => [o.customerName || '-', o.status || '-', money(o.totalAmount), o.createdAt ? new Date(o.createdAt).toLocaleDateString('uz-UZ') : '-'])} empty="Buyurtma yo‘q" />
      </section>

      <section className="dashboard-split">
        <SimpleList
          title="Yaroqlilik muddati yaqin"
          rows={expiringSoon.slice(0, 8).map((stock) => {
            const row = stock as Record<string, unknown>;
            return [
              String(row.productName || '-'),
              String(row.batchNumber || '-'),
              `${Number(row.quantity || 0)} dona`,
              row.expiryDate ? new Date(String(row.expiryDate)).toLocaleDateString('uz-UZ') : '-',
            ];
          })}
          empty="30 kun ichida muddati tugaydigan mahsulot yo‘q"
        />
        <SimpleList
          title="Audit loglar"
          rows={auditLogs.slice(0, 8).map((log) => [
            log.action || '-',
            log.entityType || '-',
            log.actor?.email || log.actor?.username || '-',
            log.createdAt ? new Date(log.createdAt).toLocaleString('uz-UZ') : '-',
          ])}
          empty="Audit log yo‘q"
        />
      </section>
    </div>
  );
}