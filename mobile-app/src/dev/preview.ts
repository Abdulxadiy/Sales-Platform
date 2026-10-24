/** Explicit, development-only design data. Never a fallback for a failed API call. */
import { isDesignPreview } from '../api/environment';
export { isDesignPreview } from '../api/environment';
export const previewUser = {
  id: 900001, username: 'design-preview', first_name: 'Demo', last_name: '',
  phone_number: '', role: 'owner' as const, terms_accepted: true,
  tenants: [{ id: 900001, name: 'Demo do‘kon', is_owner: true, permissions: ['*'] }],
};
const products = [
  ['Sut 1 L', 12000, 2], ['Non', 4000, 3], ['Suv 1.5 L', 5000, 2],
  ['Shakar 1 kg', 16000, 1], ['Choy 100 g', 18000, 1], ["Yog' 1 L", 22000, 1],
  ['Guruch 1 kg', 15000, 2], ['Tuxum (10 dona)', 18000, 1], ['Tuz 1 kg', 3000, 1],
  ['Makaron 500 g', 8000, 1],
].map(([name, price, quantity], index) => ({
  id: index + 1, product: index + 1, product_name: String(name), name: 'Standart',
  unit: 'dona', price_recommended: Number(price), price_min: 0, price_partner: Number(price), currency: 'UZS', image: null,
  barcode: '47800000000' + String(index + 1).padStart(2, '0'), stock_quantity: 50,
  quantity: Number(quantity),
}));
const customers = [
  { id: 1, name: 'Ali Valiyev', phone_number: '', debt_amount: 230000, sales_count: 1 },
  { id: 2, name: 'Dilnoza Karimova', phone_number: '', debt_amount: 320000, sales_count: 1 },
];
const sales = new Map<number, any>();
const intents = new Map<string, any>();
function makeSale(payload: any, id: number) {
  const items = (payload.items || products.map(p => ({ product_variant_id: p.id, quantity: p.quantity, unit_price: p.id === 1 ? 11500 : p.price_recommended }))).map((line: any) => {
    const product = products.find(p => p.id === Number(line.product_variant_id));
    return { ...line, product_name: product?.product_name || 'Demo tovar', unit: 'dona', total_price: Number(line.quantity) * Number(line.unit_price) };
  });
  return { id, receipt_number: 'DEMO-' + id, items, total_amount: items.reduce((sum: number, line: any) => sum + line.total_price, 0),
    counterparty_name: 'Ali Valiyev', payment_type: payload.payment_type || 'cash', created_at: new Date().toISOString(), _preview: true };
}
sales.set(1043, makeSale({}, 1043));

export async function previewRequest(endpoint: string, options: { method?: string; body?: any }): Promise<any> {
  if (!isDesignPreview) throw Error('Design preview is disabled');
  const url = new URL(endpoint, 'http://design.invalid'), path = url.pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body || {};
  if (method === 'GET') {
    if (path === '/tenants/current/') return { id: previewUser.tenants[0].id, name: 'Demo do‘kon', usd_rate: '12000.00', receipt_settings: { is_vat_payer: false, vat_rate: '12.00', price_includes_vat: true } };
    if (path === '/auth/me/') return previewUser;
    if (path === '/tenants/my/') return previewUser.tenants;
    if (path === '/analytics/dashboard/') return { today_sales_sum: 2450000, sales_count: 24, debt_sum: 860000 };
    if (path === '/catalog/variants/') return { results: products.filter(p => p.product_name.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase())) };
    if (path === '/sales/counterparties/') return { results: customers };
    if (path === '/sales/') return { results: [...sales.values()] };
    const match = path.match(/^\/sales\/(\d+)\/$/);
    if (match && sales.has(Number(match[1]))) return sales.get(Number(match[1]));
  }
  if (method === 'POST' && path === '/sales/') {
    if (!body.items?.length) throw Error('Savat bo‘sh');
    if (body.idempotency_key && intents.has(body.idempotency_key)) return [intents.get(body.idempotency_key)];
    const sale = makeSale(body, 1044 + sales.size);
    sales.set(sale.id, sale);
    if (body.idempotency_key) intents.set(body.idempotency_key, sale);
    return [sale];
  }
  if (method === 'POST' && path === '/sales/counterparties/') {
    const customer = { id: Date.now(), ...body, debt_amount: 0, sales_count: 0 };
    customers.push(customer); return customer;
  }
  if (method === 'POST' && /^\/sales\/counterparties\/\d+\/payments\/$/.test(path)) return { id: Date.now(), ...body, _preview: true };
  throw Error('Bu amal dizayn preview rejimida ulanmagan; haqiqiy serverga yuborilmadi.');
}
