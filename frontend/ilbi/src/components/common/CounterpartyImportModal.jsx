import React from 'react';
import SpreadsheetImportModal from './SpreadsheetImportModal';
import { salesApi } from '../../api/client';

const api = {
  getImportTemplate: salesApi.getCounterpartyImportTemplate,
  previewImport: salesApi.previewCounterpartyImport,
  commitImport: salesApi.commitCounterpartyImport,
};
const fieldNames = {
  name: 'Mijoz', phone_number: 'Telefon', debt_balance_uzs: 'Nasiya (UZS)',
  debt_balance_usd: 'Nasiya (USD)', note: 'Izoh',
};
const money = (value) => Number.isFinite(Number(value || 0))
  ? Number(value || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 2 }) : String(value);
const columns = [
  { label: 'Mijoz', render: (data) => data.name },
  { label: 'Telefon', render: (data) => data.phone_number },
  { label: 'Nasiya (UZS)', render: (data) => money(data.debt_balance_uzs) },
  { label: 'Nasiya (USD)', render: (data) => money(data.debt_balance_usd) },
];

export default function CounterpartyImportModal(props) {
  return <SpreadsheetImportModal {...props} api={api}
    title="Excel / CSV fayldan mijoz va nasiya yuklash" templateFilename="ilbi-mijozlar-shablon.xlsx"
    fieldNames={fieldNames} columns={columns} entityLabel="mijoz" requiredFields="mijoz, telefon"
    prepareHint="Excel shablonini yuklab oling, mijozlar va boshlang‘ich nasiya summalarini kiriting."
    note="Nasiya ustunlari ixtiyoriy: bo‘sh bo‘lsa 0 hisoblanadi. Boshlang‘ich nasiya hisob tuzatishi sifatida yoziladi. Mavjud mijozlar o‘zgartirilmaydi; takror telefonlar qabul qilinmaydi." />;
}
