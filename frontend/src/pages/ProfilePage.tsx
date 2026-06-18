import { Bell, Building2, CheckCircle2, CreditCard, Download, Eye, FileUp, Heart, LayoutDashboard, Lock, LogOut, Mail, MapPin, PackageSearch, Phone, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Star, Trash2, UserCheck, UserCog, UserRound, CalendarClock } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { api } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Badge, Button, Card, Empty, Field } from '../components/Ui';
import { EditProfileModal, OrderDetailModal, PrescriptionPreviewModal, LogoutConfirmModal } from '../components/ProfileModals';
import type { AuthState, OnlineOrder, Product, User } from '../types';
import { displayName, money, productPrice } from '../utils/format';
import { saveAuth } from '../utils/storage';
import { AuthPage } from './AuthPage';
import { go } from '../app/navigation';

type ProfileAddress = { id: string; title: string; address: string; note?: string; primary?: boolean; lat?: number; lng?: number };

function SecurityItem({ icon, title, value, ok }: { icon: ReactNode; title: string; value: string; ok: boolean }) {
  return (
    <article className="security-item">
      {icon}
      <div><strong>{title}</strong><span>{value}</span></div>
      <Badge tone={ok ? 'success' : 'warning'}>{ok ? 'Verified' : 'Not verified'}</Badge>
    </article>
  );
}

export function ProfilePage({
  auth,
  favorites,
  orders,
  products,
  onAdd,
  onAuth,
  onFavorite,
  onLogout,
  onOpen,
}: {
  auth: AuthState | null;
  favorites: string[];
  orders: OnlineOrder[];
  products: Product[];
  onAdd: (product: Product) => void;
  onAuth: (auth: AuthState) => void;
  onFavorite: (product: Product) => void;
  onLogout: () => void;
  onOpen: (product: Product) => void;
}) {
  const [status, setStatus] = useState('');
  const [active, setActive] = useState('dashboard');
  const [editing, setEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [previewPrescription, setPreviewPrescription] = useState<string | null>(null);
  const [prescriptionZoom, setPrescriptionZoom] = useState(1);
  const [twoFactor, setTwoFactor] = useState(() => localStorage.getItem('dorixona_2fa') === 'on');
  const [notificationPrefs, setNotificationPrefs] = useState(() => JSON.parse(localStorage.getItem('dorixona_notifications') || '{"sms":true,"email":true,"push":true,"promo":false}') as { sms: boolean; email: boolean; push: boolean; promo: boolean });
  const [addresses, setAddresses] = useState<ProfileAddress[]>(() => JSON.parse(localStorage.getItem('dorixona_addresses') || '[]') as ProfileAddress[]);
  const [payments, setPayments] = useState<Array<{ id: string; type: string; title: string; masked: string; primary?: boolean }>>(() => JSON.parse(localStorage.getItem('dorixona_payments') || '[]') as Array<{ id: string; type: string; title: string; masked: string; primary?: boolean }>);
  const [prescriptions, setPrescriptions] = useState<Array<{ id: string; date: string; status: string; doctor?: string; fileName?: string }>>(() => JSON.parse(localStorage.getItem('dorixona_prescriptions') || '[]') as Array<{ id: string; date: string; status: string; doctor?: string; fileName?: string }>);
  const [editingAddress, setEditingAddress] = useState<ProfileAddress | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressDraftLocation, setAddressDraftLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStatus, setMapStatus] = useState('Lokatsiyani aniqlash uchun tugmani bosing yoki xaritadan nuqta tanlang.');
  const [toast, setToast] = useState('');
  
  if (!auth) return <AuthPage onAuth={onAuth} />;
  const currentAuth = auth;
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));
  const activeOrders = orders.filter((order) => order.status === 'PENDING' || order.status === 'APPROVED').length;
  const deliveredOrders = orders.filter((order) => order.status === 'DELIVERED' || order.status === 'APPROVED').length;
  const bonusPoints = Math.max(orders.length * 35, 120);
  const resolvedAddresses: ProfileAddress[] = addresses.length ? addresses : [{ id: 'default-home', title: 'Uy', address: auth.user.delivery_address || 'Manzil kiritilmagan', note: 'Asosiy yetkazish manzili', primary: true }];
  const resolvedPayments = payments.length ? payments : [{ id: 'cash', type: 'Naqd', title: 'Naqd to‘lov', masked: 'Yetkazilganda to‘lash', primary: true }];
  const resolvedPrescriptions = prescriptions;
  const registeredDate = auth.user.createdAt || auth.user.created_at;
  const profileMenu = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['orders', 'Mening Buyurtmalarim', ShoppingBag],
    ['favorites', 'Sevimli Mahsulotlar', Heart],
    ['prescriptions', 'Retseptlarim', FileUp],
    ['addresses', 'Manzillarim', Building2],
    ['payments', 'To‘lov Usullari', CreditCard],
    ['bonus', 'Bonus Ballar', Star],
    ['security', 'Xavfsizlik', Lock],
    ['notifications', 'Bildirishnomalar', Bell],
    ['settings', 'Sozlamalar', UserCog],
  ] as const;
  const notificationOptions: Array<[keyof typeof notificationPrefs, string]> = [
    ['sms', 'SMS Notifications'],
    ['email', 'Email Notifications'],
    ['push', 'Push Notifications'],
    ['promo', 'Promotional Messages'],
  ];

  useEffect(() => { localStorage.setItem('dorixona_addresses', JSON.stringify(addresses)); }, [addresses]);
  useEffect(() => { localStorage.setItem('dorixona_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('dorixona_prescriptions', JSON.stringify(prescriptions)); }, [prescriptions]);
  useEffect(() => { localStorage.setItem('dorixona_notifications', JSON.stringify(notificationPrefs)); }, [notificationPrefs]);
  useEffect(() => { localStorage.setItem('dorixona_2fa', twoFactor ? 'on' : 'off'); }, [twoFactor]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const user = await api.updateMe({
        full_name: String(form.get('full_name') || ''),
        tel_number: String(form.get('tel_number') || ''),
        delivery_address: String(form.get('delivery_address') || ''),
      });
      const next: AuthState = { ...currentAuth, user: { ...currentAuth.user, ...user } };
      saveAuth(next);
      onAuth(next);
      setStatus('Profil saqlandi');
      setEditing(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Saqlanmadi');
    }
  }
  
  function addFavoriteToCart(product: Product) {
    onAdd(product);
    setToast(`${product.name} savatchaga qo‘shildi`);
    window.setTimeout(() => setToast(''), 2200);
  }

  async function setPrimaryAddress(address: { id: string; address: string }) {
    setAddresses(() => resolvedAddresses.map((item) => ({ ...item, primary: item.id === address.id })));
    try {
      const user = await api.updateMe({ delivery_address: address.address });
      const next: AuthState = { ...currentAuth, user: { ...currentAuth.user, ...user } };
      saveAuth(next);
      onAuth(next);
      notifyProfile('Asosiy manzil backendga saqlandi');
    } catch (error) {
      notifyProfile(error instanceof Error ? error.message : 'Manzil saqlanmadi');
    }
  }

  async function savePrimaryAddressToBackend(address: string, successMessage: string) {
    try {
      const user = await api.updateMe({ delivery_address: address });
      const next: AuthState = { ...currentAuth, user: { ...currentAuth.user, ...user } };
      saveAuth(next);
      onAuth(next);
      notifyProfile(successMessage);
    } catch (error) {
      notifyProfile(error instanceof Error ? error.message : 'Manzil backendga saqlanmadi');
    }
  }

  function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const address = String(form.get('address') || '').trim();
    if (!address) { notifyProfile('Manzil maydoni bo‘sh bo‘lmasin.'); return; }
    const title = String(form.get('title') || 'Manzil').trim() || 'Manzil';
    const note = String(form.get('note') || '').trim();
    if (editingAddress) {
      const edited = { ...editingAddress, title, address, note, ...(addressDraftLocation || {}) };
      setAddresses((list) => { const source = list.length ? list : resolvedAddresses; return source.map((item) => item.id === editingAddress.id ? edited : item); });
      if (editingAddress.primary) void savePrimaryAddressToBackend(address, 'Asosiy manzil yangilandi');
      else notifyProfile('Manzil tahrirlandi');
      setEditingAddress(null); setAddressDraftLocation(null); event.currentTarget.reset(); return;
    }
    const shouldBePrimary = !addresses.length && !currentAuth.user.delivery_address;
    const next = { id: crypto.randomUUID(), title, address, note, primary: shouldBePrimary, ...(addressDraftLocation || {}) };
    setAddresses((list) => [next, ...(list.length ? list : resolvedAddresses.filter((item) => item.id !== 'default-home'))]);
    notifyProfile('Manzil qo‘shildi');
    if (next.primary) void savePrimaryAddressToBackend(address, 'Yangi asosiy manzil saqlandi');
    setAddressDraftLocation(null); event.currentTarget.reset();
  }

  function startEditAddress(address: ProfileAddress) { setActive('addresses'); setEditingAddress(address); setAddressDraftLocation(address.lat && address.lng ? { lat: address.lat, lng: address.lng } : null); notifyProfile('Manzil formaga chiqarildi. O‘zgartirib saqlang.'); }
  async function deleteAddress(address: ProfileAddress) {
    const nextList = resolvedAddresses.filter((item) => item.id !== address.id);
    const fallback = nextList[0] ? { ...nextList[0], primary: true } : null;
    const normalized = fallback ? [fallback, ...nextList.slice(1).map((item) => ({ ...item, primary: false }))] : [];
    setAddresses(normalized.filter((item) => item.id !== 'default-home'));
    if (editingAddress?.id === address.id) setEditingAddress(null);
    if (address.primary && fallback) { await savePrimaryAddressToBackend(fallback.address, 'Manzil o‘chirildi, yangi asosiy manzil saqlandi'); return; }
    if (address.primary && !fallback) { await savePrimaryAddressToBackend('', 'Manzil o‘chirildi'); return; }
    notifyProfile('Manzil o‘chirildi');
  }

  function notifyProfile(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2200); }

  const profileCompletion = [Boolean(auth.user.tel_number), Boolean(auth.user.email), Boolean(auth.user.delivery_address || addresses.length), Boolean(payments.length)].filter(Boolean).length;
  const profileCompletionPercent = Math.round((profileCompletion / 4) * 100);

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div>
          <Badge tone="success"><ShieldCheck size={14} /> Tasdiqlangan kabinet</Badge>
          <h1>Shaxsiy profil</h1>
          <p>Buyurtmalar, retseptlar, manzillar, to‘lovlar va sevimli mahsulotlarni bitta joyda boshqaring.</p>
        </div>
        <div className="profile-hero-actions">
          <Button onClick={() => setEditing(true)}><UserCog size={18} /> Edit Profile</Button>
          <Button onClick={() => setToast('Parol almashtirish so‘rovi qabul qilindi. Backend endpoint qo‘shilganda SMS/Email tasdiq ulanadi.')} variant="secondary"><Lock size={18} /> Change Password</Button>
          <Button onClick={() => setLogoutConfirm(true)} variant="ghost"><LogOut size={18} /> Chiqish</Button>
        </div>
      </section>
      <div className="profile-layout">
        <aside className="profile-nav">
          <div className="profile-mini">
            <div className="avatar-xl">{displayName(auth.user).slice(0, 1).toUpperCase()}</div>
            <strong>{displayName(auth.user)}</strong>
            <span>{auth.user.email || 'Email kiritilmagan'}</span>
          </div>
          {profileMenu.map(([id, label, Icon]) => (<button className={active === id ? 'active' : ''} key={id} onClick={() => setActive(id)} type="button"><Icon size={18} /> {label}</button>))}
          <button className="danger-link" onClick={() => setLogoutConfirm(true)} type="button"><LogOut size={18} /> Chiqish</button>
        </aside>
        <main className="profile-content">
          <Card className="user-info-card">
            <div className="avatar-plate">
              <div className="avatar-xxl">{displayName(auth.user).slice(0, 1).toUpperCase()}</div>
              <span className="online-dot">Online</span>
              <Badge tone="success">Telefon tasdiqlangan</Badge>
            </div>
            <div className="user-info-main">
              <span>Premium mijoz</span>
              <h2>{displayName(auth.user)}</h2>
              <div className="profile-badges"><Badge tone="neutral"><Star size={13} /> Premium User</Badge><Badge tone="success"><UserCheck size={13} /> Verified</Badge></div>
              <div className="profile-fields">
                <p><b>User ID</b>{auth.user.id || 'LOCAL-USER'}</p>
                <p><b>Telefon</b>{auth.user.tel_number || '+998 -- --- -- --'}</p>
                <p><b>Email</b>{auth.user.email || 'Email yo‘q'}</p>
                <p><b>Ro‘yxatdan o‘tgan</b>{registeredDate ? new Date(registeredDate).toLocaleDateString('uz-UZ') : '-'}</p>
                <p><b>Manzil</b>{auth.user.delivery_address || 'Manzil kiritilmagan'}</p>
                <p><b>Tug‘ilgan sana</b>{auth.user.age ? `${auth.user.age} yosh` : 'Kiritilmagan'}</p>
              </div>
            </div>
            <Button onClick={() => setEditing(true)} variant="secondary">Tahrirlash</Button>
          </Card>
          <div className="profile-stats">
            <button className="profile-stat card" onClick={() => { setActive('orders'); notifyProfile('Buyurtmalar bo‘limi ochildi.'); }} type="button"><ShoppingBag /><span>Jami Buyurtmalar</span><strong>{orders.length}</strong></button>
            <button className="profile-stat card" onClick={() => { setActive('orders'); notifyProfile('Faol buyurtmalarni jadvaldan kuzating.'); }} type="button"><CalendarClock /><span>Faol Buyurtmalar</span><strong>{activeOrders}</strong></button>
            <button className="profile-stat card" onClick={() => { setActive('orders'); notifyProfile('Yetkazilgan buyurtmalar tarixi ochildi.'); }} type="button"><CheckCircle2 /><span>Yetkazilgan</span><strong>{deliveredOrders}</strong></button>
            <button className="profile-stat card" onClick={() => { setActive('bonus'); notifyProfile('Bonus ballar bo‘limi ochildi.'); }} type="button"><Star /><span>Bonus Ballar</span><strong>{bonusPoints}</strong></button>
          </div>
          {active === 'dashboard' && (
            <Card className="profile-section dashboard-actions">
              <div className="section-head"><div><span>Dashboard vazifalari</span><h2>Tezkor boshqaruv</h2></div><Badge tone={profileCompletionPercent === 100 ? 'success' : 'warning'}>{profileCompletionPercent}% profil</Badge></div>
              <div className="dashboard-action-grid">
                <button onClick={() => go('catalog')} type="button"><PackageSearch size={20} /><strong>Katalog</strong><span>Dorilarni ko‘rish va savatga qo‘shish</span></button>
                <button onClick={() => go('cart')} type="button"><ShoppingCart size={20} /><strong>Savat</strong><span>Tanlangan mahsulotlarni buyurtma qilish</span></button>
                <button onClick={() => go('prescription')} type="button"><FileUp size={20} /><strong>Retsept yuklash</strong><span>Retseptli dorilar uchun fayl yuborish</span></button>
                <button onClick={() => { setActive('addresses'); notifyProfile('Manzillar boshqaruvi ochildi.'); }} type="button"><MapPin size={20} /><strong>Manzillar</strong><span>Yetkazish manzilini qo‘shish yoki asosiy qilish</span></button>
                <button onClick={() => { setActive('payments'); notifyProfile('To‘lov usullari ochildi.'); }} type="button"><CreditCard size={20} /><strong>To‘lov</strong><span>Karta, Click, Payme yoki naqd to‘lov</span></button>
                <button onClick={() => { setActive('notifications'); notifyProfile('Bildirishnoma sozlamalari ochildi.'); }} type="button"><Bell size={20} /><strong>Bildirishnoma</strong><span>SMS, email, push va aksiya xabarlarini sozlash</span></button>
              </div>
            </Card>
          )}
          {(active === 'dashboard' || active === 'orders') && (
            <Card className="profile-section">
              <div className="section-head"><div><span>So‘nggi buyurtmalar</span><h2>Buyurtma tarixi</h2></div><Button onClick={() => go('orders')} variant="secondary">Hammasi</Button></div>
              <div className="orders-table">
                <div className="orders-head"><span>ID</span><span>Sana</span><span>Mahsulot</span><span>Narx</span><span>Status</span><span></span></div>
                {orders.slice(0, 6).map((order, index) => (
                  <div className="orders-row" key={order.id || index}>
                    <b>{order.id?.slice(0, 8) || '-'}</b>
                    <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ') : '-'}</span>
                    <span>{Array.isArray(order.items) ? order.items.length : 1} ta</span>
                    <strong>{money(order.totalAmount)}</strong>
                    <Badge tone={order.status === 'REJECTED' ? 'danger' : order.status === 'APPROVED' ? 'success' : 'warning'}>{order.status || 'Tayyorlanmoqda'}</Badge>
                    <Button onClick={() => setSelectedOrder(order)} variant="secondary">Batafsil</Button>
                  </div>
                ))}
                {!orders.length && <Empty title="Buyurtma yo‘q" text="Savatdan buyurtma berganingizda shu yerda ko‘rinadi." />}
              </div>
            </Card>
          )}
          {(active === 'dashboard' || active === 'prescriptions') && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Retseptlar</span><h2>Yuklangan retseptlar</h2></div><Button onClick={() => go('prescription')} variant="secondary"><FileUp size={17} /> Yangi yuklash</Button></div>
              <div className="prescription-grid">
                {resolvedPrescriptions.map((item) => (
                  <article className="prescription-card" key={item.id}>
                    <div><FileUp size={28} /></div>
                    <strong>{item.id}</strong>
                    <span>{new Date(item.date).toLocaleDateString('uz-UZ')}</span>
                    <Badge tone={item.status === 'Tasdiqlangan' ? 'success' : 'warning'}>{item.status}</Badge>
                    <div className="row-actions">
                      <Button onClick={() => { setPrescriptionZoom(1); setPreviewPrescription(item.id); }} variant="secondary"><Eye size={16} /> View</Button>
                      <Button onClick={() => { const blob = new Blob([`Dorixona retsepti: ${item.id}`], {type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=item.fileName||`${item.id}.txt`; link.click(); URL.revokeObjectURL(url); }} variant="secondary"><Download size={16} /> PDF</Button>
                      <Button onClick={() => setPrescriptions((list) => list.filter((r) => r.id !== item.id))} variant="danger"><Trash2 size={16} /></Button>
                    </div>
                  </article>
                ))}
                {!resolvedPrescriptions.length && <Empty title="Retsept yo‘q" text="Retsept yuklanganda shu yerda ko‘rinadi." />}
              </div>
              <form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get('file') as File | null; const next = {id:`RX-${Date.now().toString().slice(-6)}`, date: new Date().toISOString(), status: 'Tekshiruvda', doctor: String(form.get('doctor') || 'Shifokor ko‘rsatilmagan'), fileName: file?.name || 'retsept.pdf'}; setPrescriptions((list) => [next, ...list]); setToast('Retsept saqlandi'); event.currentTarget.reset(); }}>
                <Field label="Shifokor"><input name="doctor" placeholder="Shifokor ismi" /></Field>
                <Field label="Retsept fayli"><input accept="image/*,.pdf" name="file" type="file" /></Field>
                <Button type="submit"><FileUp size={17} /> Retsept saqlash</Button>
              </form>
            </Card>
          )}
          {(active === 'dashboard' || active === 'favorites') && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Wishlist</span><h2>Sevimli mahsulotlar</h2></div><Button onClick={() => go('catalog')} variant="secondary">Katalogga o‘tish</Button></div>
              <div className="profile-products">{favoriteProducts.map((product) => (<ProductCard favorite={favorites.includes(product.id)} key={product.id} product={product} onAdd={addFavoriteToCart} onFavorite={onFavorite} onOpen={onOpen} />))}{!favoriteProducts.length && <Empty title="Sevimli mahsulot yo‘q" text="Katalogdan yurak belgisini bosib mahsulot qo‘shing." />}</div>
            </Card>
          )}
          {active === 'payments' && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Payments</span><h2>To‘lov usullari</h2></div></div>
              <div className="address-grid">{resolvedPayments.map((payment) => (<article className="address-card" key={payment.id}><CreditCard size={22} /><strong>{payment.title} {payment.primary ? '· Asosiy' : ''}</strong><p>{payment.type} · {payment.masked}</p><div className="row-actions"><Button onClick={() => setPayments(() => resolvedPayments.map((item) => ({...item, primary: item.id === payment.id})))} variant="secondary">Asosiy</Button><Button disabled={payment.id === 'cash'} onClick={() => setPayments((list) => list.filter((item) => item.id !== payment.id))} variant="danger"><Trash2 size={16} /></Button></div></article>))}</div>
              <form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const cardNumber = String(form.get('card') || '').replace(/\D/g, ''); const masked = cardNumber ? `**** **** **** ${cardNumber.slice(-4).padStart(4, '*')}` : String(form.get('masked') || 'Naqd'); const next = {id:crypto.randomUUID(), type: String(form.get('type') || 'Karta'), title: String(form.get('title') || 'To‘lov usuli'), masked, primary: !payments.length }; setPayments((list) => [next, ...list]); setToast('To‘lov usuli qo‘shildi'); event.currentTarget.reset(); }}>
                <Field label="Turi"><select name="type"><option>Karta</option><option>Click</option><option>Payme</option><option>Naqd</option></select></Field>
                <Field label="Nomi"><input name="title" placeholder="Asosiy karta" required /></Field>
                <Field label="Karta raqami"><input name="card" placeholder="8600 0000 0000 0000" /></Field>
                <Button type="submit"><CreditCard size={17} /> To‘lov qo‘shish</Button>
              </form>
            </Card>
          )}
          {(active === 'dashboard' || active === 'bonus') && (
            <Card className="profile-section bonus-card">
              <div className="section-head"><div><span>Bonus system</span><h2>{bonusPoints} ball</h2></div><Badge tone="success">Silver</Badge></div>
              <div className="bonus-progress"><i><b style={{width:`${Math.min(100, (bonusPoints / 500) * 100)}%`}} /></i><span>Gold darajaga 500 ball kerak</span></div>
              <div className="level-grid">{['Bronze', 'Silver', 'Gold', 'Platinum'].map((level) => <span className={level === 'Silver' ? 'active' : ''} key={level}>{level}</span>)}</div>
              <div className="row-actions"><Button onClick={() => notifyProfile('Bonus ballar savatda chegirma sifatida ishlatiladi.')}>Ballarni ishlatish</Button><Button onClick={() => setActive('orders')} variant="secondary">Bonus tarixini ko‘rish</Button></div>
            </Card>
          )}
          {(active === 'dashboard' || active === 'security') && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Security</span><h2>Xavfsizlik markazi</h2></div></div>
              <div className="security-grid">
                <SecurityItem icon={<Phone />} title="Phone Verification" value="Verified" ok />
                <SecurityItem icon={<Mail />} title="Email Verification" value={auth.user.email ? 'Verified' : 'Not Verified'} ok={Boolean(auth.user.email)} />
                <article className="security-item"><Lock /><div><strong>Two Factor Authentication</strong><span>{twoFactor ? 'SMS kod va QR tayyor' : 'O‘chiq'}</span></div><button className={twoFactor ? 'switch on' : 'switch'} onClick={() => setTwoFactor((value) => !value)} type="button"><i /></button></article>
              </div>
              <div className="session-list">{([['MacBook Air', 'Chrome', '127.0.0.1', 'Hozir'],['iPhone', 'Safari', '192.168.1.22', 'Kecha']] as const).map(([device, browser, ip, last]) => (<div className="session-row" key={device}><Smartphone /><b>{device}</b><span>{browser}</span><span>{ip}</span><em>{last}</em></div>))}</div>
              <Button onClick={() => { setToast('Barcha sessiyalar yopildi'); window.setTimeout(onLogout, 600); }} variant="danger">Logout All Devices</Button>
            </Card>
          )}
          {(active === 'dashboard' || active === 'notifications') && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Preferences</span><h2>Bildirishnoma sozlamalari</h2></div></div>
              <div className="prefs-grid">{notificationOptions.map(([key, label]) => (<label className="pref-row" key={key}><span>{label}</span><button className={notificationPrefs[key] ? 'switch on' : 'switch'} onClick={() => setNotificationPrefs((value) => ({...value, [key]: !value[key]}))} type="button"><i /></button></label>))}</div>
              <Button onClick={() => setToast('Bildirishnoma sozlamalari saqlandi')}>Save Settings</Button>
            </Card>
          )}
          {active === 'settings' && (
            <Card className="profile-section">
              <div className="section-head"><div><span>Settings</span><h2>Sozlamalar</h2></div></div>
              <form className="form-grid compact-form" onSubmit={(event) => { event.preventDefault(); notifyProfile('Sozlamalar saqlandi'); }}>
                <Field label="Til"><select name="language"><option>O‘zbekcha</option><option>Русский</option><option>English</option></select></Field>
                <Field label="Interfeys"><select name="density"><option>Qulay</option><option>Ixcham</option><option>Keng</option></select></Field>
                <Field label="Email"><input defaultValue={auth.user.email || ''} readOnly /></Field>
                <Button type="submit"><UserCog size={17} /> Saqlash</Button>
              </form>
              <div className="security-grid"><SecurityItem icon={<ShieldCheck />} title="Keyboard navigation" value="Yoqilgan" ok /><SecurityItem icon={<Eye />} title="Accessibility" value="WCAG AA kontrast" ok /></div>
            </Card>
          )}
        </main>
      </div>
      {editing && <EditProfileModal auth={auth} status={status} onClose={() => setEditing(false)} onSubmit={submit} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      {previewPrescription && <PrescriptionPreviewModal prescriptionId={previewPrescription} onClose={() => setPreviewPrescription(null)} />}
      {logoutConfirm && <LogoutConfirmModal onConfirm={onLogout} onCancel={() => setLogoutConfirm(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}