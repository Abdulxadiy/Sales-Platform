import React from 'react';
import { render } from '@testing-library/react-native';
import { CANONICAL_DEBTS, DebtsScreen } from '../src/features/debts/DebtsScreen';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('../src/dev/preview', () => ({ isDesignPreview: true }));

describe('Debts Domain & Canonical Financial Rules (Board 27A & Master Spec)', () => {
  test('Canonical 4 debts sum to exactly 860 000 UZS', () => {
    expect(CANONICAL_DEBTS).toHaveLength(4);
    const total = CANONICAL_DEBTS.reduce((sum, item) => sum + item.amount, 0);
    expect(total).toBe(860000);
  });

  test('Status filtering correctly identifies overdue and due-soon counterparties', () => {
    const overdueDebts = CANONICAL_DEBTS.filter((d) => d.status === 'overdue');
    const soonDebts = CANONICAL_DEBTS.filter((d) => d.status === 'soon');
    const futureDebts = CANONICAL_DEBTS.filter((d) => d.status === 'future');

    expect(overdueDebts).toHaveLength(1);
    expect(overdueDebts[0].customerName).toBe('Aziz Rahimov');
    expect(overdueDebts[0].amount).toBe(180000);

    expect(soonDebts).toHaveLength(1);
    expect(soonDebts[0].customerName).toBe('Dilnoza Karimova');
    expect(soonDebts[0].amount).toBe(320000);

    expect(futureDebts).toHaveLength(2);
  });

  test('Partial payment reduces balance without removing debtor', () => {
    const originalDebts = CANONICAL_DEBTS.map((d) => ({ ...d }));
    const target = originalDebts.find((d) => d.id === 1)!;
    expect(target.amount).toBe(230000);

    const payAmount = 100000;
    const updatedDebts = originalDebts
      .map((d) => (d.id === target.id ? { ...d, amount: d.amount - payAmount } : d))
      .filter((d) => d.amount > 0);

    const updatedTarget = updatedDebts.find((d) => d.id === 1)!;
    expect(updatedTarget.amount).toBe(130000);
    expect(updatedDebts).toHaveLength(4);

    const newTotal = updatedDebts.reduce((sum, d) => sum + d.amount, 0);
    expect(newTotal).toBe(760000); // 860 000 - 100 000
  });

  test('Full payment reduces debt to 0 and clears debtor from active list', () => {
    const originalDebts = CANONICAL_DEBTS.map((d) => ({ ...d }));
    const target = originalDebts.find((d) => d.id === 1)!;

    const payAmount = 230000; // Full payment
    const updatedDebts = originalDebts
      .map((d) => (d.id === target.id ? { ...d, amount: d.amount - payAmount } : d))
      .filter((d) => d.amount > 0);

    expect(updatedDebts.find((d) => d.id === 1)).toBeUndefined();
    expect(updatedDebts).toHaveLength(3);

    const newTotal = updatedDebts.reduce((sum, d) => sum + d.amount, 0);
    expect(newTotal).toBe(630000); // 860 000 - 230 000
  });

  test('DebtsScreen renders canonical total and debtor names', async () => {
    const screen = await render(
      <ThemeProvider>
        <DebtsScreen />
      </ThemeProvider>
    );

    // Canonical total 860 000 displayed
    expect(screen.getByText(/860\s?000/)).toBeTruthy();
    // Names displayed
    expect(screen.getByText('Ali Valiyev')).toBeTruthy();
    expect(screen.getByText('Dilnoza Karimova')).toBeTruthy();
    expect(screen.getByText('Aziz Rahimov')).toBeTruthy();
    expect(screen.getByText('Malika Sobirova')).toBeTruthy();
  });
});
