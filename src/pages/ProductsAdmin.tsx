import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button, Card, Field, PageTitle } from '../components/Ui';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { api } from '../api/client';
import { assetUrl, money, productPrice, productCategory, productStock } from '../utils/format';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/constants';
import type { Product } from '../types';

export function ProductsAdmin({ products, onReload }: { products: Product[]; onReload: () => void }) {
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const readProductPayload = (form: FormData): Partial<Product> => {
    const sku = String(form.get('sku') || '').trim();
    const manufacturer = String(form.get('manufacturer') || '').trim();
    const imageUrl = String(form.get('imageUrl') || '').trim();
    const expiryDate = String(form.get('expiryDate') || '');
    const payload: Partial<Product> = {
      name: String(form.get('name') || ''),
      barcode: String(form.get('barcode') || ''),
      sellingPrice: Number(form.get('sellingPrice') || 0),
      purchasePrice: Number(form.get('purchasePrice') || 0),
      expiryDate,
    };
    if (sku) payload.sku = sku;
    if (manufacturer) payload.manufacturer = manufacturer;
    if (imageUrl) payload.imageUrl = imageUrl;
    if (!editing) {
      payload.stockBatches = [{
        batchNumber: String(form.get('batchNumber') || ''),
        quantity: Number(form.get('quantity') || 0),
        reorderLevel: Number(form.get('reorderLevel') || 10),
        expiryDate,
      }];
    }
    return payload;
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const imageFile = form.get('imageFile') instanceof File && (form.get('imageFile') as File).size > 0 ? form.get('imageFile') as File : null;
    try {
      const payload = readProductPayload(form);
      let savedProduct: Product;
      if (editing?.id) {
        savedProduct = await api.updateProduct(editing.id, payload);
        if (imageFile) savedProduct = await api.uploadProductImage(savedProduct.id, imageFile);
        setStatus('Mahsulot yangilandi');
        setEditing(null);
      } else {
        savedProduct = await api.createProduct(payload);
        if (imageFile) await api.uploadProductImage(savedProduct.id, imageFile);
        setStatus('Mahsulot qo‘shildi');
      }
      onReload();
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Saqlanmadi');
    }
  }

  async function removeProduct(product: Product) {
    if (!product.id || !window.confirm(`${product.name} o‘chirilsinmi?`)) return;
    try {
      await api.deleteProduct(product.id);
      setStatus('Mahsulot o‘chirildi');
      if (editing?.id === product.id) setEditing(null);
      onReload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'O‘chirilmadi');
    }
  }

  return (
    <div className="page">
      <PageTitle eyebrow="Admin" title="Mahsulotlar CRUD" text="Qo‘shish, tahrirlash va o‘chirish backend /products bilan ishlaydi." />
      <Card>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Nomi"><input defaultValue={editing?.name || ''} key={`name-${editing?.id || 'new'}`} name="name" required /></Field>
          <Field label="Barcode"><input defaultValue={editing?.barcode || ''} key={`barcode-${editing?.id || 'new'}`} name="barcode" required /></Field>
          <Field label="SKU"><input defaultValue={editing?.sku || ''} key={`sku-${editing?.id || 'new'}`} name="sku" /></Field>
          <Field label="Ishlab chiqaruvchi"><input defaultValue={editing?.manufacturer || ''} key={`manufacturer-${editing?.id || 'new'}`} name="manufacturer" /></Field>
          <Field label="Rasm URL"><input defaultValue={editing?.imageUrl || ''} key={`image-${editing?.id || 'new'}`} name="imageUrl" placeholder="https:// yoki bo‘sh qoldiring" /></Field>
          <Field label="Rasm fayli"><input accept="image/jpeg,image/png,image/webp,image/gif" name="imageFile" type="file" /></Field>
          <Field label="Sotish narxi"><input defaultValue={productPrice(editing || ({} as Product)) || ''} key={`selling-${editing?.id || 'new'}`} name="sellingPrice" required type="number" /></Field>
          <Field label="Sotib olish narxi"><input defaultValue={editing?.purchasePrice || ''} key={`purchase-${editing?.id || 'new'}`} name="purchasePrice" required type="number" /></Field>
          <Field label="Boshlang‘ich miqdor"><input disabled={Boolean(editing)} min="0" name="quantity" required={!editing} type="number" /></Field>
          <Field label="Minimal qoldiq"><input disabled={Boolean(editing)} min="0" name="reorderLevel" type="number" /></Field>
          <Field label="Partiya raqami"><input disabled={Boolean(editing)} name="batchNumber" required={!editing} /></Field>
          <Field label="Yaroqlilik"><input defaultValue={editing?.expiryDate ? String(editing.expiryDate).slice(0, 10) : ''} key={`expiry-${editing?.id || 'new'}`} name="expiryDate" required type="date" /></Field>
          <Button type="submit"><Plus size={18} /> {editing ? 'Yangilash' : 'Qo‘shish'}</Button>
          {editing && <Button onClick={() => setEditing(null)} type="button" variant="ghost">Bekor</Button>}
        </form>
        {status && <p className="status-text">{status}</p>}
      </Card>
      <Card>
        <h2 className="card-title">Dorilar ro‘yxati</h2>
        <div className="table-like">
          {products.map((p) => (
            <div className="table-row" key={p.id}>
              <span>{p.name}</span>
              <span>{productCategory(p)}</span>
              <span>{money(productPrice(p))}</span>
              <span>{productStock(p)} dona</span>
              <div className="row-actions">
                <Button onClick={() => setEditing(p)} variant="secondary">Tahrirlash</Button>
                <Button disabled={!p.imageUrl} onClick={() => setPreviewProduct(p)} variant="secondary">Rasm</Button>
                <Button onClick={() => removeProduct(p)} variant="danger">O‘chirish</Button>
              </div>
            </div>
          ))}
          {!products.length && <p className="status-text">Dori yo‘q</p>}
        </div>
      </Card>
      {previewProduct && (
        <ImagePreviewModal
          alt={previewProduct.name}
          src={assetUrl(previewProduct.imageUrl) || PRODUCT_IMAGE_FALLBACK}
          title={previewProduct.name}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
}