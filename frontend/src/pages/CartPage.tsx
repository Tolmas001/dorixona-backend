import { CreditCard, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Empty, PageTitle } from '../components/Ui';
import { go } from '../app/navigation';
import { api, ApiError } from '../api/client';
import { assetUrl, displayName, money, productPrice } from '../utils/format';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/constants';
import type { AuthState, CartLine, Product } from '../types';

export function CartPage({ auth, cart, setCart, total, onOrdered }: { auth: AuthState | null; cart: CartLine[]; setCart: (cart: CartLine[] | ((prev: CartLine[]) => CartLine[])) => void; total: number; onOrdered: () => void }) {
  const [status, setStatus] = useState('');

  async function submit() {
    if (!auth) {
      go('profile');
      return;
    }
    try {
      await api.createOnlineOrder({
        pharmacyId: auth.user.pharmacy_id || auth.user.pharmacyId || null,
        customerName: displayName(auth.user),
        customerPhone: auth.user.tel_number || '',
        items: cart.map((line) => ({
          productId: line.product.id,
          id: line.product.id,
          name: line.product.name,
          quantity: line.quantity,
          price: productPrice(line.product),
          total: productPrice(line.product) * line.quantity,
        })),
      });
      setCart([]);
      setStatus('Buyurtma yuborildi. Admin tasdiqlashi kutilmoqda.');
      onOrdered();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Buyurtma yuborilmadi');
    }
  }

  return (
    <div className="page cart-page">
      <PageTitle eyebrow="Savat" title="Buyurtma savati" text="Miqdorlarni tekshirib, buyurtmani yuboring." />
      <Card className="cart-layout">
        <div className="list">
          {cart.map((line) => (
            <div className="cart-row" key={line.product.id}>
              <img
                alt={line.product.name}
                onError={(event) => { event.currentTarget.src = PRODUCT_IMAGE_FALLBACK; }}
                src={assetUrl(line.product.imageUrl) || PRODUCT_IMAGE_FALLBACK}
              />
              <div className="cart-item-main">
                <strong>{line.product.name}</strong>
                <span>{money(productPrice(line.product))}</span>
              </div>
              <div className="cart-item-actions">
                <div className="qty">
                  <button onClick={() => setCart(cart.map((item) => item.product.id === line.product.id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item))} type="button">-</button>
                  <b>{line.quantity}</b>
                  <button onClick={() => setCart(cart.map((item) => item.product.id === line.product.id ? { ...item, quantity: item.quantity + 1 } : item))} type="button">+</button>
                </div>
                <strong>{money(productPrice(line.product) * line.quantity)}</strong>
                <button className="cart-remove" onClick={() => setCart(cart.filter((item) => item.product.id !== line.product.id))} type="button" aria-label="Savatdan o‘chirish"><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
          {!cart.length && <Empty title="Savat bo‘sh" text="Katalogdan dori qo‘shing." />}
        </div>
        <aside className="total-box">
          <span>Jami</span>
          <strong>{money(total)}</strong>
          <div className="cart-summary-lines">
            <p><span>Mahsulotlar</span><b>{cart.reduce((sum, line) => sum + line.quantity, 0)} ta</b></p>
            <p><span>Yetkazish</span><b>Admin tasdiqlaydi</b></p>
            <p><span>To‘lov</span><b>Naqd / karta</b></p>
          </div>
          <Button disabled={!cart.length} onClick={submit}><CreditCard size={18} /> Buyurtma berish</Button>
          {status && <p className="status-text">{status}</p>}
        </aside>
      </Card>
    </div>
  );
}