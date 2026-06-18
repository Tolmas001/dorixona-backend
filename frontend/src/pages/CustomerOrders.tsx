import { CalendarClock, CheckCircle2, CreditCard, Download, MapPin, Search, ShoppingBag, ShoppingCart, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Empty } from '../components/Ui';
import { go } from '../app/navigation';
import { assetUrl, money, productPrice } from '../utils/format';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/constants';
import {
  getOrderItems,
  getDeliveryAddress,
  getDeliveryMethod,
  getPaymentLabel,
  getStatusTone,
  getStatusLabel,
  getOrderTimelineIndex,
  isOrderActive,
  isOrderDelivered,
  isOrderPending,
  type OrderLine,
} from '../utils/helpers';
import type { OnlineOrder, Product } from '../types';

type UiOrder = OnlineOrder & { status?: string; totalAmount?: number | string; items?: unknown[] };

const ORDER_FILTERS = [
  ['all', 'All Orders'],
  ['active', 'Active Orders'],
  ['delivered', 'Delivered Orders'],
  ['prescription', 'Prescription Orders'],
  ['cancelled', 'Cancelled Orders'],
] as const;

function OrderTimeline({ status }: { status: string }) {
  const steps = ['Order Confirmed', 'Payment Received', 'Preparing Order', 'Out For Delivery', 'Delivered'];
  const activeIndex = getOrderTimelineIndex(status);
  return (
    <div className="order-timeline">
      {steps.map((step, index) => (
        <div className={index <= Math.max(activeIndex, 0) ? 'done' : ''} key={step}>
          <span>{index <= Math.max(activeIndex, 0) ? '✓' : '○'}</span>
          <strong>{step}</strong>
          <small>{index <= Math.max(activeIndex, 0) ? 'Completed' : 'Waiting'}</small>
        </div>
      ))}
    </div>
  );
}

function OrderDetailsModal({ order, products, onClose }: { order: UiOrder; products: Product[]; onClose: () => void }) {
  const items = getOrderItems(order, products);
  return (
    <div className="modal-backdrop">
      <div className="order-modal">
        <div className="section-head">
          <div><span>Order details</span><h2>Order #{order.id || '-'}</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="modal-products">
          {items.map((item) => (
            <article key={`${order.id}-${item.productId}-${item.name}`}>
              <img alt={item.name} src={assetUrl(item.imageUrl) || PRODUCT_IMAGE_FALLBACK} />
              <div><strong>{item.name}</strong><span>{item.quantity} x {money(item.price)}</span></div>
              <b>{money(item.total)}</b>
            </article>
          ))}
          {!items.length && <Empty title="Mahsulotlar ko‘rsatilmagan" text="Bu buyurtma itemlari backend javobida kelmagan." />}
        </div>
        <div className="detail-panels">
          <p><b>Recipient</b><span>{order.customerName || 'Dorixona mijozi'}</span></p>
          <p><b>Phone</b><span>{order.customerPhone || '+998 -- --- -- --'}</span></p>
          <p><b>Address</b><span>{getDeliveryAddress(order)}</span></p>
          <p><b>Payment</b><span>{getPaymentLabel(order).replace('Payment: ', '')}</span></p>
          <p><b>Transaction ID</b><span>{order.id || '-'}</span></p>
          <p><b>Notes</b><span>{order.notes || 'Admin buyurtmani tekshiradi va tasdiqlaydi.'}</span></p>
        </div>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function InvoiceModal({ order, products, onClose }: { order: UiOrder; products: Product[]; onClose: () => void }) {
  const items = getOrderItems(order, products);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const deliveryFee = items.length ? 12000 : 0;
  const tax = Math.round(subtotal * 0.02);
  const total = Number(order.totalAmount || subtotal + deliveryFee + tax);
  const lines = [
    'Dorixona Invoice',
    `Order #${order.id}`,
    ...items.map((item) => `${item.name} x ${item.quantity} - ${money(item.total)}`),
    `Taxes - ${money(tax)}`,
    `Delivery Fee - ${money(deliveryFee)}`,
    `Total - ${money(total)}`,
  ];
  function downloadInvoice() {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${order.id || 'dorixona'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="modal-backdrop">
      <div className="invoice-modal">
        <div className="section-head">
          <div><span>Invoice preview</span><h2>Dorixona Invoice</h2></div>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="invoice-box">
          <div className="invoice-brand"><ShoppingBag /><b>Dorixona</b><span>Order #{order.id || '-'}</span></div>
          {items.map((item) => <p key={`${item.productId}-${item.name}`}><span>{item.name} x {item.quantity}</span><b>{money(item.total)}</b></p>)}
          <p><span>Taxes</span><b>{money(tax)}</b></p>
          <p><span>Delivery Fee</span><b>{money(deliveryFee)}</b></p>
          <strong><span>Total Amount</span><b>{money(total)}</b></strong>
        </div>
        <div className="row-actions">
          <Button onClick={downloadInvoice}><Download size={17} /> Download PDF</Button>
          <Button onClick={() => window.print()} variant="secondary">Print Invoice</Button>
        </div>
      </div>
    </div>
  );
}

export function CustomerOrders({ orders, products, onAdd }: { orders: OnlineOrder[]; products: Product[]; onAdd: (product: Product) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedOrder, setSelectedOrder] = useState<UiOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<UiOrder | null>(null);
  const [toast, setToast] = useState('');

  const normalizedOrders: UiOrder[] = orders.map((order) => ({
    ...order,
    status: order.status || 'PENDING',
    totalAmount: order.totalAmount ?? 0,
    items: Array.isArray(order.items) ? order.items : [],
  }));
  const total = normalizedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const active = normalizedOrders.filter((order) => isOrderActive(String(order.status))).length;
  const delivered = normalizedOrders.filter((order) => isOrderDelivered(String(order.status))).length;

  const filteredOrders = normalizedOrders
    .filter((order) => {
      const items = getOrderItems(order, products);
      const haystack = `${order.id} ${items.map((item) => item.name).join(' ')}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase().trim());
      const status = String(order.status || '').toUpperCase();
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && isOrderActive(status)) ||
        (filter === 'delivered' && isOrderDelivered(status)) ||
        (filter === 'prescription' && items.some((item) => item.prescription)) ||
        (filter === 'cancelled' && ['CANCELLED', 'REJECTED'].includes(status));
      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
      if (sort === 'highest') return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (sort === 'lowest') return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  }

  function reorder(order: UiOrder) {
    getOrderItems(order, products).forEach((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (product) onAdd(product);
    });
    notify('Products successfully added to your cart.');
  }

  return (
    <div className="page orders-page">
      <section className="orders-hero">
        <div>
          <Badge tone="success"><ShoppingBag size={14} /> My Orders</Badge>
          <h1>Buyurtmalarim</h1>
          <p>View and manage all your pharmacy orders, prescription requests, delivery tracking and invoices.</p>
        </div>
        <div className="orders-tools">
          <div className="orders-search"><Search size={18} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Order ID, product name, prescription..." value={query} /></div>
          <select onChange={(event) => setSort(event.target.value)} value={sort}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Price</option>
            <option value="lowest">Lowest Price</option>
          </select>
        </div>
      </section>
      <div className="order-filters">
        {ORDER_FILTERS.map(([id, label]) => <button className={filter === id ? 'active' : ''} key={id} onClick={() => setFilter(id)} type="button">{label}</button>)}
      </div>
      <div className="order-stat-grid">
        <Card className="order-stat"><ShoppingBag /><span>Total Orders</span><strong>{normalizedOrders.length}</strong></Card>
        <Card className="order-stat"><CalendarClock /><span>Active Orders</span><strong>{active}</strong></Card>
        <Card className="order-stat"><CheckCircle2 /><span>Delivered Orders</span><strong>{delivered}</strong></Card>
        <Card className="order-stat"><CreditCard /><span>Total Spending</span><strong>{money(total)}</strong></Card>
      </div>
      <div className="orders-list">
        {filteredOrders.map((order) => {
          const items = getOrderItems(order, products);
          const status = String(order.status || 'PENDING').toUpperCase();
          const orderKey = order.id || `${order.createdAt || 'order'}-${items.length}`;
          const active = isOrderActive(status);
          const delivered = isOrderDelivered(status);
          const pending = isOrderPending(status);
          return (
            <Card className="order-premium-card" key={orderKey}>
              <div className="order-card-head">
                <div>
                  <span>Order #{order.id || '-'}</span>
                  <h2>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}</h2>
                  <p>{getPaymentLabel(order)}</p>
                </div>
                <div>
                  <strong>{money(order.totalAmount)}</strong>
                  <Badge tone={getStatusTone(status)}>{getStatusLabel(status)}</Badge>
                </div>
              </div>
              <div className="order-products-preview">
                {items.slice(0, 3).map((item) => (
                  <article key={`${order.id}-${item.productId}-${item.name}`}>
                    <img alt={item.name} src={assetUrl(item.imageUrl) || PRODUCT_IMAGE_FALLBACK} />
                    <div><strong>{item.name}</strong><span>Qty: {item.quantity} · {money(item.price)}</span>{item.prescription && <Badge tone="warning">Prescription Required</Badge>}</div>
                  </article>
                ))}
                {items.length > 3 && <button onClick={() => setSelectedOrder(order)} type="button">+{items.length - 3} More</button>}
              </div>
              <div className="delivery-panel">
                <p><MapPin size={16} /><span>Delivery address</span><b>{getDeliveryAddress(order)}</b></p>
                <p><ShoppingCart size={16} /><span>Delivery method</span><b>{getDeliveryMethod(order)}</b></p>
                <p><CalendarClock size={16} /><span>Estimated arrival</span><b>Admin tasdiqlaydi</b></p>
              </div>
              {active && <OrderTimeline status={status} />}
              <div className="order-actions">
                <Button onClick={() => setSelectedOrder(order)} variant="secondary">View Details</Button>
                {active && <Button onClick={() => notify('Yetkazib berish kuzatuvi ochildi.')} variant="secondary">Track Order</Button>}
                {active && <Button onClick={() => notify(`Qo‘llab-quvvatlash so‘rovi yuborildi. Buyurtma: #${String(order.id).slice(0, 8)}`)} variant="secondary">Contact Support</Button>}
                {delivered && <Button onClick={() => reorder(order)}>Reorder</Button>}
                {delivered && <Button onClick={() => setInvoiceOrder(order)} variant="secondary"><Download size={17} /> Download Invoice</Button>}
                {delivered && <Button onClick={() => notify(`Fikr qoldirish oynasi tayyor: #${String(order.id).slice(0, 8)}`)} variant="secondary">Leave Review</Button>}
                {pending && <Button onClick={() => notify('Buyurtmani tahrirlash uchun batafsil oyna ochildi.')} variant="secondary">Edit Order</Button>}
                {pending && <Button onClick={() => notify(`Bekor qilish so‘rovi yuborildi: #${String(order.id).slice(0, 8)}`)} variant="danger">Cancel Order</Button>}
                {items.some((item) => item.prescription) && <Button onClick={() => setSelectedOrder(order)} variant="secondary">View Prescription</Button>}
              </div>
            </Card>
          );
        })}
        {!filteredOrders.length && (
          <Card className="orders-empty">
            <ShoppingBag size={54} />
            <h2>No orders found.</h2>
            <p>Browse medicines or upload prescription to start your first pharmacy order.</p>
            <div className="row-actions">
              <Button onClick={() => go('catalog')}>Browse Medicines</Button>
              <Button onClick={() => go('prescription')} variant="secondary">Upload Prescription</Button>
            </div>
          </Card>
        )}
      </div>
      {selectedOrder && <OrderDetailsModal order={selectedOrder} products={products} onClose={() => setSelectedOrder(null)} />}
      {invoiceOrder && <InvoiceModal order={invoiceOrder} products={products} onClose={() => setInvoiceOrder(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}