import { Bell, FileUp, Heart, LogOut, Menu, Mic, PackageSearch, Search, ShoppingBag, UserCog, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Ui';
import { go } from '../app/navigation';
import { displayName, money, productPrice } from '../utils/format';
import { POPULAR_TAGS } from '../utils/constants';
import type { AuthState, Product } from '../types';

export function Header({
  auth,
  cartCount,
  products,
  showMenu,
  onLogout,
  onMenu,
  onSearch,
}: {
  auth: AuthState | null;
  cartCount: number;
  products: Product[];
  showMenu: boolean;
  onLogout: () => void;
  onMenu: () => void;
  onSearch: (value: string) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const headerRef = useRef<HTMLElement | null>(null);
  const suggestions = products
    .filter((product) => product.name.toLowerCase().includes(searchValue.toLowerCase().trim()))
    .slice(0, 5);

  function submitSearch(value = searchValue) {
    if (!value.trim()) return;
    onSearch(value);
    closeHeaderPanels();
  }

  function closeHeaderPanels() {
    setSearchOpen(false);
    setNoticeOpen(false);
    setAvatarOpen(false);
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeHeaderPanels();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeHeaderPanels();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className={showMenu ? 'top-header' : 'top-header no-menu'} ref={headerRef}>
      {showMenu && <button className="menu-button" onClick={() => { closeHeaderPanels(); onMenu(); }} type="button"><Menu size={21} /></button>}
      <button className="brand-button" onClick={() => { closeHeaderPanels(); go('home'); }} type="button">
        <span><ShoppingBag size={22} /></span>
        <strong>Dorixona</strong>
      </button>
      <div className="header-search">
        <Search size={18} />
        <input
          onChange={(event) => {
            setSearchValue(event.target.value);
            setSearchOpen(true);
            setNoticeOpen(false);
            setAvatarOpen(false);
          }}
          onFocus={() => {
            setSearchOpen(true);
            setNoticeOpen(false);
            setAvatarOpen(false);
          }}
          onKeyDown={(event) => event.key === 'Enter' && submitSearch()}
          placeholder="Dori, barcode yoki kategoriya..."
          value={searchValue}
        />
        <button className="voice-button" type="button" aria-label="Voice search"><Mic size={17} /></button>
        {searchOpen && (
          <div className="header-popover search-popover">
            <strong>Qidiruv tavsiyalari</strong>
            {(suggestions.length ? suggestions : products.slice(0, 4)).map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setSearchValue(product.name);
                  submitSearch(product.name);
                }}
                type="button"
              >
                <PackageSearch size={16} />
                <span>{product.name}</span>
                <small>{money(productPrice(product))}</small>
              </button>
            ))}
            {!products.length && <span className="popover-muted">Mahsulotlar backenddan kelganda shu yerda chiqadi.</span>}
            <div className="popular-tags">
              {POPULAR_TAGS.map((tag) => (
                <button key={tag} onClick={() => { setSearchValue(tag); submitSearch(tag); }} type="button">{tag}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="header-actions">
        <Button className="category-button" onClick={() => { closeHeaderPanels(); go('catalog'); }} variant="secondary"><PackageSearch size={17} /> <span>Kategoriya</span></Button>
        <Button aria-label="Sevimli mahsulotlar" className="icon-action" onClick={() => { closeHeaderPanels(); go('catalog'); }} title="Sevimlilar" variant="secondary"><Heart size={17} /></Button>
        <Button className="cart-button" onClick={() => { closeHeaderPanels(); go('cart'); }} variant="secondary"><ShoppingBag size={17} /> <span>Savat</span> <b>{cartCount}</b></Button>
        <div className="notice-wrap">
          <Button
            className="icon-action"
            onClick={() => {
              setNoticeOpen((open) => !open);
              setSearchOpen(false);
              setAvatarOpen(false);
            }}
            variant="secondary"
          >
            <Bell size={17} />
          </Button>
          {noticeOpen && (
            <div className="header-popover notice-popover">
              <strong>Bildirishnomalar</strong>
              <p><b>Buyurtma holati:</b> Admin tasdig‘i kutilmoqda.</p>
              <p><b>Aksiya:</b> Vitaminlar haftaligi davom etmoqda.</p>
              <p><b>Yangilik:</b> Retsept yuklash bo‘limi yangilandi.</p>
            </div>
          )}
        </div>
        {auth ? (
          <>
            <div className="avatar-menu">
              <button
                className="avatar-trigger"
                onClick={() => {
                  setAvatarOpen((open) => !open);
                  setSearchOpen(false);
                  setNoticeOpen(false);
                }}
                type="button"
              >
                <span>{displayName(auth.user).slice(0, 1).toUpperCase()}</span>
                <b>{displayName(auth.user)}</b>
              </button>
              {avatarOpen && (
                <div className="header-popover avatar-popover">
                  <button onClick={() => { closeHeaderPanels(); go('profile'); }} type="button"><UserRound size={17} /> Profil</button>
                  <button onClick={() => { closeHeaderPanels(); go('orders'); }} type="button"><ShoppingBag size={17} /> Buyurtmalar</button>
                  <button onClick={() => { closeHeaderPanels(); go('prescription'); }} type="button"><FileUp size={17} /> Retseptlar</button>
                  <button onClick={() => { closeHeaderPanels(); go('profile'); }} type="button"><UserCog size={17} /> Sozlamalar</button>
                  <button onClick={() => { closeHeaderPanels(); onLogout(); }} type="button"><LogOut size={17} /> Logout</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Button className="login-button" onClick={() => { closeHeaderPanels(); go('profile'); }}><UserRound size={17} /> Kirish</Button>
        )}
      </div>
    </header>
  );
}