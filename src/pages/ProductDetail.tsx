import { FileUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, Empty } from '../components/Ui';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { go } from '../app/navigation';
import { assetUrl, isPrescription, money, productCategory, productPrice, productStock } from '../utils/format';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/constants';
import type { Product } from '../types';

export function ProductDetail({ product, onAdd }: { product?: Product; onAdd: (product: Product) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!product) return <Empty title="Mahsulot topilmadi" text="Katalogdan mahsulot tanlang." />;
  const imageSrc = assetUrl(product.imageUrl) || PRODUCT_IMAGE_FALLBACK;
  return (
    <div className="page">
      <Card className="detail-card">
        <button className="detail-image image-open-button" onClick={() => setPreviewOpen(true)} type="button">
          <img alt={product.name} src={imageSrc} />
          <span>Rasmni ochish</span>
        </button>
        <div className="detail-info">
          {isPrescription(product) && <Badge tone="warning">Retsept talab qilinadi</Badge>}
          <h1>{product.name}</h1>
          <p>{productCategory(product)}</p>
          <strong className="big-price">{money(productPrice(product))}</strong>
          <div className="detail-table">
            <span>Barcode</span><b>{product.barcode || '-'}</b>
            <span>SKU</span><b>{product.sku || '-'}</b>
            <span>Qoldiq</span><b>{productStock(product)} dona</b>
            <span>Yaroqlilik</span><b>{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('uz-UZ') : '-'}</b>
          </div>
          <div className="hero-actions">
            <Button onClick={() => onAdd(product)}><Plus size={18} /> Savatga qo‘shish</Button>
            <Button onClick={() => go('prescription')} variant="secondary"><FileUp size={18} /> Retsept yuklash</Button>
          </div>
        </div>
      </Card>
      {previewOpen && <ImagePreviewModal alt={product.name} src={imageSrc} title={product.name} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}