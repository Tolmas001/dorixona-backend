import { useState } from 'react';
import { Button, Card, Empty, Field, PageTitle } from '../components/Ui';
import { ProductCard } from '../components/ProductCard';
import { api } from '../api/client';
import { money, productPrice } from '../utils/format';
import type { CartLine, Product } from '../types';

export function CashierPage({ products, onSold }: { products: Product[]; onSold: () => void }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState('Naqd');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const subtotal = cart.reduce((sum, line) => sum + productPrice(line.product) * line.quantity, 0);
  const total = subtotal - subtotal * discount / 100;
  const add = (product: Product) => setCart((current) => {
    const exists = current.find((line) => line.product.id === product.id);
    if (exists) {
      return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
    }
    return [...current, { product, quantity: 1 }];
  });
  const changeQuantity = (productId: string, delta: number) => setCart((current) =>
    current
      .map((line) => line.product.id === productId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line)
      .filter((line) => line.quantity > 0),
  );
  async function completeSale() {
    if (!cart.length) {
      setStatus('Chek bo‘sh. Avval dori tanlang.');
      return;
    }
    setSaving(true);
    setStatus('');
    try {
      await api.createSale({
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentType,
        discountPercent: discount,
        discountAmount: 0,
        notes: 'Kassa orqali savdo',
      });
      setCart([]);
      setDiscount(0);
      setStatus('Savdo backendga yozildi va ombor qoldig‘i yangilandi.');
      onSold();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Savdo yakunlanmadi');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page">
      <PageTitle eyebrow="Kassa" title="Savdo oynasi" text="Barcode yoki nom bo‘yicha dori tanlab chek chiqaring." />
      <div className="cashier">
        <Card><div className="product-grid compact">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={add} onOpen={() => null} />)}</div></Card>
        <Card className="total-box">
          <h3>Chek</h3>
          {cart.map((line) => (
            <div className="row cashier-row" key={line.product.id}>
              <span>{line.product.name}</span>
              <div className="qty">
                <button onClick={() => changeQuantity(line.product.id, -1)} type="button">-</button>
                <b>{line.quantity}</b>
                <button onClick={() => changeQuantity(line.product.id, 1)} type="button">+</button>
              </div>
              <b>{money(productPrice(line.product) * line.quantity)}</b>
            </div>
          ))}
          {!cart.length && <Empty title="Chek bo‘sh" text="Chap tomondan mahsulot tanlang." />}
          <Field label="To‘lov turi">
            <select onChange={(e) => setPaymentType(e.target.value)} value={paymentType}>
              <option>Naqd</option><option>Karta</option><option>Click</option><option>Payme</option>
            </select>
          </Field>
          <Field label="Chegirma %"><input min="0" max="100" onChange={(e) => setDiscount(Number(e.target.value))} type="number" value={discount} /></Field>
          <div className="receipt-lines">
            <span>Jami: <b>{money(subtotal)}</b></span>
            <span>Chegirma: <b>{discount}%</b></span>
          </div>
          <strong className="big-price">{money(total)}</strong>
          <Button disabled={saving || !cart.length} onClick={completeSale}>{saving ? 'Saqlanmoqda...' : 'Chekni yakunlash'}</Button>
          {status && <p className="status-text">{status}</p>}
        </Card>
      </div>
    </div>
  );
}