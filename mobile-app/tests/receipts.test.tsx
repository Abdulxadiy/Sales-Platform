import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ReceiptScreen } from '../src/features/receipts/ReceiptScreen';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { request } from '../src/api/client';
import * as Print from 'expo-print';
let mockParams: any = { saleId: '1' };
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams }));
jest.mock('../src/api/client', () => ({ request: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(async () => ({ uri: 'file:///one.pdf' })), printAsync: jest.fn(async () => {}) }));
const sale = (id: number, payment_type = 'cash') => ({ id, receipt_number: 'R&' + id, total_amount: '100.00', payment_type, items: [{ product_name: 'Item ' + id, quantity: '1.000', unit_price: '100.00' }] });
describe('Receipt identity and payment display', () => {
  beforeEach(() => { jest.clearAllMocks(); mockParams = { saleId: '1' }; });
  test.each([undefined, 'abc', '0', ['1', '2']])('missing or invalid ID %j shows an actionable error', async saleId => {
    mockParams = { saleId };
    const screen = await render(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    expect(screen.getByText('Chek raqami noto‘g‘ri yoki ko‘rsatilmagan.')).toBeTruthy();
    expect(screen.getByText('Orqaga')).toBeTruthy(); expect(request).not.toHaveBeenCalled();
  });
  test('request failure offers retry and renders the exact native header string', async () => {
    jest.mocked(request).mockRejectedValueOnce(Error('Offline')).mockResolvedValueOnce(sale(1));
    const screen = await render(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    await fireEvent.press(await screen.findByText('Chekni qayta yuklash'));
    expect(await screen.findByText('Chek #R&1')).toBeTruthy();
  });
  test.each(['card', 'debt'])('%s receipts never label payment as cash or show change', async method => {
    jest.mocked(request).mockResolvedValueOnce(sale(1, method));
    const screen = await render(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    expect(await screen.findByText(method === 'card' ? 'Karta:' : 'Nasiya:')).toBeTruthy();
    expect(screen.queryByText('Naqd:')).toBeNull(); expect(screen.queryByText('Qaytim:')).toBeNull();
  });
  test('changing sale ID resets PDF state and ignores old in-flight receipt data', async () => {
    jest.mocked(request).mockResolvedValueOnce(sale(1));
    const screen = await render(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    await screen.findByText('Chek #R&1');
    // PDF is a mocked adapter; this test checks identity/reset, not native file generation.
    await fireEvent.press(screen.getByText('Ulashish'));
    await fireEvent.press(screen.getByText('PDF yuklab olish'));
    expect(screen.getByText('PDF tayyor')).toBeTruthy();
    expect(jest.mocked(Print.printToFileAsync).mock.calls[0][0]?.html).toContain('R&amp;1');
    mockParams = { saleId: '2' };
    jest.mocked(request).mockResolvedValueOnce(sale(2));
    await screen.rerender(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    expect(await screen.findByText('Chek #R&2')).toBeTruthy();
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(screen.queryByText('PDF tayyor')).toBeNull();
    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
  });
  test('late response for previous ID cannot replace the new receipt', async () => {
    let finish!: (v: any) => void;
    jest.mocked(request).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(sale(2));
    const screen = await render(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    mockParams = { saleId: '2' }; await screen.rerender(<ThemeProvider><ReceiptScreen /></ThemeProvider>);
    await act(async () => { finish(sale(1)); });
    expect(await screen.findByText('Chek #R&2')).toBeTruthy(); expect(screen.queryByText('Item 1')).toBeNull();
  });
});
