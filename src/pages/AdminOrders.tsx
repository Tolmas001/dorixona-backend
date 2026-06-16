import { Badge, Button, Card, Empty, PageTitle } from '../components/Ui';
import { api } from '../api/client';
import { money } from '../utils/format';
import type { OnlineOrder } from '../types';

export function AdminOrders({ orders, onReload }: { orders: OnlineOrder[]; onReload: () => void }) {
  async function change(id: string, approve: boolean) {
    if (approve) await api.approveOrder(id);
    else await api.rejectOrder(id, 'Admin bekor qildi');
    onReload();
  }
  return (
    <div className="page">
      <PageTitle eyebrow="Admin" title="Online buyurtmalar" text="Xaridor buyurtmasini admin tasdiqlaydi." />
      <div className="list">
        {orders.map((order) => (
          <Card className="order-card" key={order.id}>
            <div><strong>{order.customerName}</strong><span>{order.customerPhone}</span></div>
            <Badge tone={order.status === 'APPROVED' ? 'success' : order.status === 'REJECTED' ? 'danger' : 'warning'}>{order.status || 'PENDING'}</Badge>
            <strong>{money(order.totalAmount)}</strong>
            <div className="row-actions">
              <Button disabled={order.status !== 'PENDING'} onClick={() => order.id && change(order.id, true)}>Tasdiqlash</Button>
              <Button disabled={order.status !== 'PENDING'} onClick={() => order.id && change(order.id, false)} variant="danger">Bekor</Button>
            </div>
          </Card>
        ))}
        {!orders.length && <Empty title="Buyurtma yo‘q" />}
      </div>
    </div>
  );
}