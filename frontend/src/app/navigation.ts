export type Page =
  | 'home'
  | 'catalog'
  | 'product'
  | 'cart'
  | 'orders'
  | 'prescription'
  | 'profile'
  | 'admin'
  | 'cashier'
  | 'adminProducts'
  | 'inventory'
  | 'adminOrders'
  | 'super';

export function routePage(): Page {
  return (window.location.pathname.replace('/', '') || 'home') as Page;
}

export function go(page: Page) {
  window.history.pushState({}, '', page === 'home' ? '/' : '/' + page);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
