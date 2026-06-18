import { Bell, Boxes, LayoutDashboard, PackageSearch, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import type { AuthState } from '../types';
import type { Page } from '../app/navigation';

const adminNav = [
  ['admin', 'Dashboard', LayoutDashboard],
  ['cashier', 'Kassa', ShoppingCart],
  ['adminProducts', 'Mahsulotlar', PackageSearch],
  ['inventory', 'Ombor', Boxes],
  ['adminOrders', 'Online buyurtmalar', Bell],
  ['super', 'Super admin', ShieldCheck],
] as const;

export function Sidebar({ auth, open, page, onClose, onGo }: { auth: AuthState | null; open: boolean; page: Page; onClose: () => void; onGo: (page: Page) => void }) {
  return (
    <>
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head">
          <strong>Dorixona</strong>
          <button onClick={onClose} type="button"><X size={18} /></button>
        </div>
        {adminNav.map(([id, label, Icon]) => {
          if (id === 'super' && auth?.user.role !== 'SUPER_ADMIN') return null;
          return (
            <button className={page === id ? 'active' : ''} key={id} onClick={() => onGo(id as Page)} type="button">
              <Icon size={19} /> {label}
            </button>
          );
        })}
      </aside>
      {open && <button className="scrim" onClick={onClose} type="button" aria-label="Yopish" />}
    </>
  );
}