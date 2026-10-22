import React, { useId } from 'react';
import CustomDatePicker from './CustomDatePicker';

export default function DebtDueDateField({ value, onChange }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        Qarzni qaytarish sanasi <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ixtiyoriy)</span>
      </label>
      <CustomDatePicker id={id} name="debt_due_date" value={value} onChange={onChange} fullWidth placeholder="Sanani tanlang..." />
      <p id={`${id}-hint`} style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: '6px 0 0' }}>
        Shu kuni mijozning qolgan umumiy qarzi haqida do‘kon egasiga eslatma chiqadi. Bo‘sh qoldirsangiz, sana bo‘yicha eslatilmaydi.
      </p>
    </div>
  );
}
