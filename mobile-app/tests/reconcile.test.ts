import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStore } from '../src/storage/recordStore';
import { withFinancialIdentity, getFinancialIntent, listFinancialIntents } from '../src/api/financialIdentity';
import { getServerScope } from '../src/api/environment';
import { request, captureAuthScope, assertAuthScope } from '../src/api/client';
import { reconcileFinancialIntent } from '../src/features/sync/reconcile';
jest.mock('../src/storage/recordStore', () => { jest.requireActual('fake-indexeddb/auto'); return jest.requireActual('../src/storage/recordStore.web'); });
jest.mock('../src/api/client', () => ({ request: jest.fn(), captureAuthScope: jest.fn(() => ({})), assertAuthScope: jest.fn() }));
const tenant = { id: 2, name: 'Store', is_owner: true, permissions: [] }, user = { id: 1, role: 'owner', terms_accepted: true, tenants: [tenant] } as any;
const sales = require('./contracts/backend.json').created_sales;
describe('Uncertain operation reconciliation', () => {
  beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); for (const [key] of await recordStore.entries()) await recordStore.update(key, () => null); });
  test('retries the saved payload with its original key and persists actual server acknowledgment', async () => {
    const body = await withFinancialIdentity('sale:uncertain', { amount: 100 }, 1, 2);
    const intent = (await getFinancialIntent('sale:uncertain', 1, 2))!;
    jest.mocked(request).mockResolvedValueOnce(sales);
    const result = await reconcileFinancialIntent(intent, user, tenant);
    expect(request).toHaveBeenCalledWith('/sales/', expect.objectContaining({ body: { amount: 100, idempotency_key: body.idempotency_key } }));
    expect(result.id).toBe(sales[0].id); expect(await listFinancialIntents(1, 2)).toHaveLength(0);
    expect((await getFinancialIntent('sale:uncertain', 1, 2))?.result.id).toBe(result.id);
  });
  test('network loss keeps the original pending intent', async () => {
    await withFinancialIdentity('sale:uncertain', {}, 1, 2);
    const intent = (await getFinancialIntent('sale:uncertain', 1, 2))!;
    jest.mocked(request).mockRejectedValueOnce(Error('Offline'));
    await expect(reconcileFinancialIntent(intent, user, tenant)).rejects.toThrow('Offline');
    expect((await listFinancialIntents(1, 2))[0].key).toBe(intent.key);
  });
  test('other-origin or unauthorized records cannot be submitted', async () => {
    await withFinancialIdentity('sale:uncertain', {}, 1, 2);
    const intent = (await getFinancialIntent('sale:uncertain', 1, 2))!;
    await expect(reconcileFinancialIntent({ ...intent, server: getServerScope() + '-other' }, user, tenant)).rejects.toThrow('tegishli emas');
    await expect(reconcileFinancialIntent(intent, { ...user, tenants: [] }, tenant)).rejects.toThrow('vakolat');
    expect(request).not.toHaveBeenCalled();
  });
  test('a session change during preparation prevents the POST', async () => {
    await withFinancialIdentity('sale:uncertain', {}, 1, 2);
    const intent = (await getFinancialIntent('sale:uncertain', 1, 2))!;
    jest.mocked(assertAuthScope).mockImplementationOnce(() => { throw Error('Session changed'); });
    await expect(reconcileFinancialIntent(intent, user, tenant)).rejects.toThrow('Session changed');
    expect(captureAuthScope).toHaveBeenCalled(); expect(request).not.toHaveBeenCalled();
  });
});
