import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStore } from '../src/storage/recordStore';
import { withFinancialIdentity, confirmFinancialIdentity, acknowledgeLegacySale, listFinancialIntents } from '../src/api/financialIdentity';
import { setApiBaseUrl, getApiBaseUrl } from '../src/api/client';

jest.mock('../src/storage/recordStore', () => { jest.requireActual('fake-indexeddb/auto'); return jest.requireActual('../src/storage/recordStore.web'); });
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-' + Math.random()) }));
describe('Durable financial retry identity', () => {
  beforeEach(async () => { await AsyncStorage.clear(); for (const [key] of await recordStore.entries()) await recordStore.update(key, () => null); });

  test('a confirmed stable cart never acquires a fresh retry key after restart', async () => {
    const first = await withFinancialIdentity('sale:cart-1', { amount: 100 }, 1, 2);
    await confirmFinancialIdentity('sale:cart-1', 1, 2, first.idempotency_key, { id: 5 });
    expect((await withFinancialIdentity('sale:cart-1', { amount: 100 }, 1, 2)).idempotency_key).toBe(first.idempotency_key);
    await expect(withFinancialIdentity('sale:cart-1', { amount: 200 }, 1, 2)).rejects.toThrow('Oldingi amal');
    expect((await withFinancialIdentity('sale:cart-2', { amount: 100 }, 1, 2)).idempotency_key).not.toBe(first.idempotency_key);
  });

  test('concurrent different carts cannot create two unresolved sales', async () => {
    const results = await Promise.allSettled(['cart-a', 'cart-b'].map(id => withFinancialIdentity('sale:' + id, { amount: 100 }, 1, 2)));
    expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(row => row.status === 'rejected')).toHaveLength(1);
  });
  test('an abandoned pending cart blocks a fresh sale until reconciliation', async () => {
    const old = await withFinancialIdentity('sale:cart-old', { amount: 100 }, 1, 2);
    await expect(withFinancialIdentity('sale:cart-new', { amount: 100 }, 1, 2)).rejects.toThrow('Oldingi amal');
    await confirmFinancialIdentity('sale:cart-old', 1, 2, old.idempotency_key, { id: 5 });
    await expect(withFinancialIdentity('sale:cart-new', { amount: 100 }, 1, 2)).resolves.toHaveProperty('idempotency_key');
  });

  test('a scoped legacy sale requires explicit review and leaves a confirmed cart tombstone', async () => {
    const old = await withFinancialIdentity('sale', { amount: 100 }, 1, 2);
    await confirmFinancialIdentity('sale', 1, 2, old.idempotency_key, { id: 5 });
    expect((await listFinancialIntents(1, 2))[0].reviewRequired).toBe(true);
    await expect(withFinancialIdentity('sale:new-cart', { amount: 100 }, 1, 2)).rejects.toThrow('Oldingi amal');
    await acknowledgeLegacySale(old.idempotency_key, 'old-cart', 1, 2);
    expect(await listFinancialIntents(1, 2)).toHaveLength(0);
    expect((await withFinancialIdentity('sale:old-cart', { amount: 100 }, 1, 2)).idempotency_key).toBe(old.idempotency_key);
    await expect(withFinancialIdentity('sale:new-cart', { amount: 100 }, 1, 2)).resolves.toHaveProperty('idempotency_key');
  });
  test('a network retry reuses its identity until server confirmation', async () => {
    const first = await withFinancialIdentity('sale', { amount: 160000 }, 1, 2);
    const retry = await withFinancialIdentity('sale', { amount: 160000 }, 1, 2);
    expect(retry.idempotency_key).toBe(first.idempotency_key);
    await confirmFinancialIdentity('sale', 1, 2);
    const next = await withFinancialIdentity('sale', { amount: 160000 }, 1, 2);
    expect(next.idempotency_key).not.toBe(first.idempotency_key);
  });
  test('another account or store cannot reuse the same identity', async () => {
    const records = await Promise.all([
      withFinancialIdentity('sale', {}, 1, 2), withFinancialIdentity('sale', {}, 2, 2), withFinancialIdentity('sale', {}, 1, 3),
    ]);
    expect(new Set(records.map(r => r.idempotency_key)).size).toBe(3);
  });
  test('concurrent submissions share one durable identity', async () => {
    const records = await Promise.all(Array.from({ length: 20 }, () => withFinancialIdentity('sale', { amount: 100 }, 1, 2)));
    expect(new Set(records.map(row => row.idempotency_key)).size).toBe(1);
  });
  test('object property order does not change retry identity', async () => {
    const one = await withFinancialIdentity('sale', { amount: 100, currency: 'UZS' }, 1, 2);
    const two = await withFinancialIdentity('sale', { currency: 'UZS', amount: 100 }, 1, 2);
    expect(one.idempotency_key).toBe(two.idempotency_key);
  });
  test('the same account and store on a different server get a separate intent', async () => {
    const original = getApiBaseUrl();
    const one = await withFinancialIdentity('sale', {}, 1, 2);
    await setApiBaseUrl('https://other.invalid/api/v1');
    const two = await withFinancialIdentity('sale', {}, 1, 2);
    expect(two.idempotency_key).not.toBe(one.idempotency_key);
    await setApiBaseUrl(original);
  });
  test('changing a sale with an uncertain result requires reconciliation', async () => {
    await withFinancialIdentity('sale', { amount: 160000 }, 1, 2);
    await expect(withFinancialIdentity('sale', { amount: 150000 }, 1, 2)).rejects.toThrow('Oldingi amal');
    await expect(withFinancialIdentity('sale', {}, undefined, 2)).rejects.toThrow();
  });
});
