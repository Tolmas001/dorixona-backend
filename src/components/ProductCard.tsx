import { Heart, LockKeyhole, Plus, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { assetUrl, isPrescription, money, productCategory, productPrice, productStock } from '../utils/format';
import { Badge, Button } from './Ui';

type Props = {
  product: Product;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
  favorite?: boolean;
  onFavorite?: (product: Product) => void;
};

export function ProductCard({ product, onOpen, onAdd, favorite, onFavorite }: Props) {
  const stock = productStock(product);
  const prescription = isPrescription(product);

  return (
    <article className="product-card">
      <button className="product-image" onClick={() => onOpen(product)} type="button">
        <img alt={product.name} src={assetUrl(product.imageUrl) || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80'} />
        {prescription && <Badge tone="warning"><LockKeyhole size={13} /> Retsept</Badge>}
      </button>
      <div className="product-body">
        <div className="product-head">
          <button onClick={() => onOpen(product)} type="button">
            <h3>{product.name}</h3>
            <p>{productCategory(product)}</p>
          </button>
          {onFavorite && (
            <button className={favorite ? 'icon-round active' : 'icon-round'} onClick={() => onFavorite(product)} type="button" aria-label="Sevimli">
              <Heart size={17} />
            </button>
          )}
        </div>
        <div className="product-meta">
          <span>{product.barcode || product.sku || 'Barcode yo‘q'}</span>
          <span>{stock > 0 ? `${stock} dona` : 'Tugagan'}</span>
        </div>
        <div className="product-bottom">
          <strong>{money(productPrice(product))}</strong>
          <Button disabled={stock <= 0} onClick={() => onAdd(product)} variant="primary">
            {stock > 0 ? <Plus size={18} /> : <ShoppingBag size={18} />}
          </Button>
        </div>
      </div>
    </article>
  );
}
