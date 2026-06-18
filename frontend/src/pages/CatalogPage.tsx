import { Search, Star } from 'lucide-react';
import { Badge, Button, Card, Empty, PageTitle } from '../components/Ui';
import { ProductCard } from '../components/ProductCard';
import { go } from '../app/navigation';
import type { Product } from '../types';

export function CatalogPage(props: {
  products: Product[];
  categories: string[];
  category: string;
  query: string;
  status: string;
  favorites: string[];
  onQuery: (value: string) => void;
  onCategory: (value: string) => void;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
  onFavorite: (product: Product) => void;
}) {
  return (
    <div className="page">
      <PageTitle eyebrow="Katalog" title="Barcha dorilar" text={props.status} />
      <Card className="catalog-tools">
        <div className="search-line"><Search size={19} /><input onChange={(event) => props.onQuery(event.target.value)} placeholder="Qidirish: nom, barcode, kategoriya" value={props.query} /></div>
        <div className="chips">
          {props.categories.map((item) => <button className={props.category === item ? 'active' : ''} key={item} onClick={() => props.onCategory(item)} type="button">{item}</button>)}
        </div>
      </Card>
      <section className="catalog-ad">
        <div>
          <Badge tone="warning"><Star size={13} /> Homiylik</Badge>
          <h2>Bugungi chegirmalar va sog‘liq takliflari</h2>
          <p>Reklama joylari keyinchalik admin paneldan boshqariladigan qilinadi. Hozir UI tayyor.</p>
        </div>
        <Button onClick={() => go('cart')} variant="secondary">Savatni ko‘rish</Button>
      </section>
      <div className="product-grid">
        {props.products.map((product) => (
          <ProductCard
            favorite={props.favorites.includes(product.id)}
            key={product.id}
            product={product}
            onAdd={props.onAdd}
            onFavorite={props.onFavorite}
            onOpen={props.onOpen}
          />
        ))}
        {!props.products.length && <Empty title="Natija yo‘q" text="Qidiruv yoki filter bo‘yicha mahsulot topilmadi." />}
      </div>
    </div>
  );
}