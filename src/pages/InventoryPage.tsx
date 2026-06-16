import { type FormEvent, useState } from 'react';
import { Button, Card, Field, PageTitle } from '../components/Ui';
import { api } from '../api/client';
import { money, productPrice, productStock } from '../utils/format';
import type { Product } from '../types';

export function InventoryPage({ products, onUpdated }: { products: Product[]; onUpdated: () => void }) {
  const [status, setStatus] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.addStock(String(form.get('productId')), {
        batchNumber: String(form.get('batchNumber') || ''),
        quantity: Number(form.get('quantity') || 0),
        reorderLevel: Number(form.get('reorderLevel') || 10),
        expiryDate: String(form.get('expiryDate') || ''),
      });
      setStatus('Partiya qo‘shildi');
      onUpdated();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Qo‘shilmadi');
    }
  }
  return (
    <div className="page">
      <PageTitle eyebrow="Ombor" title="Qoldiq nazorati" text="Partiya, yaroqlilik va minimal qoldiq." />
      <Card>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Dori"><select name="productId">{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Partiya"><input name="batchNumber" required /></Field>
          <Field label="Miqdor"><input name="quantity" required type="number" /></Field>
          <Field label="Minimal"><input name="reorderLevel" type="number" /></Field>
          <Field label="Yaroqlilik"><input name="expiryDate" required type="date" /></Field>
          <Button type="submit">Saqlash</Button>
        </form>
        {status && <p className="status-text">{status}</p>}
      </Card>
      <Card>
        <h2 className="card-title">Ombordagi mahsulotlar</h2>
        <div className="table-like">
          {products.map((p) => (
            <div className="table-row" key={p.id}>
              <span>{p.name}</span>
              <span>{productStock(p)} dona</span>
              <span>{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('uz-UZ') : '-'}</span>
            </div>
          ))}
          {!products.length && <p className="status-text">Ombor bo‘sh</p>}
        </div>
      </Card>
    </div>
  );
}