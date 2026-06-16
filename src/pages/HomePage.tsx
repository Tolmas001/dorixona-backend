import { Activity, Badge as BadgeIcon, FileUp, PackageSearch, Search, ShieldCheck, ShoppingBag, Star } from 'lucide-react';
import { Badge, Button, Card, Empty, PageTitle } from '../components/Ui';
import { ProductCard } from '../components/ProductCard';
import { go } from '../app/navigation';
import { isPrescription, productStock } from '../utils/format';
import { DEFAULT_ADS, CATEGORY_TAGS, SYMPTOM_TAGS } from '../utils/constants';
import type { Advertisement, PlatformSettings, Product } from '../types';

export function HomePage({
  products,
  advertisements,
  platformSettings,
  onSearch,
  onOpen,
  onAdd,
}: {
  products: Product[];
  advertisements: Advertisement[];
  platformSettings: PlatformSettings;
  onSearch: (value: string) => void;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
}) {
  const available = products.filter((product) => productStock(product) > 0).length;
  const prescriptionCount = products.filter(isPrescription).length;
  const visibleAds = advertisements.length
    ? advertisements.filter((ad) => !ad.placement || ad.placement === 'HOME_HERO').slice(0, 3)
    : DEFAULT_ADS;

  return (
    <div className="page">
      <section className="hero">
        <div>
          <Badge tone="success"><ShieldCheck size={14} /> Litsenziyalangan dorixona</Badge>
          <h1>{platformSettings.siteName || 'Dorixona'} orqali tez va ishonchli dori buyurtma qiling</h1>
          <p>Dorilarni qidiring, savatga qo‘shing, retsept yuklang va online buyurtmani admin tasdig‘iga yuboring.</p>
          <div className="hero-search">
            <Search size={20} />
            <input onChange={(event) => onSearch(event.target.value)} placeholder="Dori nomi, barcode yoki simptom yozing..." />
          </div>
          <div className="hero-actions">
            <Button onClick={() => go('catalog')}><ShoppingBag size={18} /> Katalog</Button>
            <Button onClick={() => go('prescription')} variant="secondary"><FileUp size={18} /> Retsept yuklash</Button>
          </div>
        </div>
        <div className="hero-art">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <div className="pill-3d"><span /><i /></div>
          <div className="capsule-float capsule-a" />
          <div className="capsule-float capsule-b" />
          <div className="capsule-float capsule-c" />
          <div className="medical-card">
            <Activity size={32} />
            <strong>24/7 online</strong>
            <span>Admin tasdiqli buyurtmalar</span>
          </div>
          <div className="vital-panel">
            <span>Pulse</span>
            <strong>98%</strong>
            <em />
          </div>
        </div>
      </section>
      <section className="ad-grid">
        {visibleAds.map((ad, index) => (
          <button
            className={`ad-card ${'tone' in ad ? ad.tone : index === 1 ? 'amber' : index === 2 ? 'blue' : 'green'}`}
            key={'id' in ad ? ad.id || ad.title : ad.title}
            onClick={() => {
              if ('targetUrl' in ad && ad.targetUrl) window.open(ad.targetUrl, '_blank');
              else go(index === 1 ? 'prescription' : index === 2 ? 'cart' : 'catalog');
            }}
            type="button"
          >
            <span>Reklama</span>
            <strong>{ad.title}</strong>
            <p>{ad.text || ''}</p>
            <b>{'cta' in ad ? (ad as { cta?: string }).cta || 'Batafsil' : 'Batafsil'}</b>
          </button>
        ))}
      </section>
      <section className="trust-grid">
        <Card className="trust-card"><ShieldCheck size={22} /><strong>Litsenziya nazorati</strong><span>Admin tasdiqlagan buyurtmalar.</span></Card>
        <Card className="trust-card"><PackageSearch size={22} /><strong>{products.length} mahsulot</strong><span>{available} tasi mavjud.</span></Card>
        <Card className="trust-card"><FileUp size={22} /><strong>{prescriptionCount} retseptli</strong><span>Antibiotiklar alohida belgilanadi.</span></Card>
      </section>
      <section className="category-strip">
        {CATEGORY_TAGS.map((item) => (
          <button key={item} onClick={() => go('catalog')} type="button">{item}</button>
        ))}
      </section>
      <PageTitle eyebrow="Ommabop" title="Mahsulotlar" text="Backend bazasidan kelayotgan mahsulotlar." />
      <div className="product-grid">
        {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onOpen={onOpen} />)}
        {!products.length && <Empty title="Mahsulot topilmadi" text="Backend ishlasa mahsulotlar shu yerda chiqadi." />}
      </div>
    </div>
  );
}