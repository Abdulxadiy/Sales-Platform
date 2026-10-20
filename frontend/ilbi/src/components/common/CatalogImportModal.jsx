import React from 'react';
import SpreadsheetImportModal from './SpreadsheetImportModal';
import { catalogApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const fieldNames = {
  name: 'Mahsulot', category: 'Kategoriya', variant_name: 'Variant', barcode: 'Shtrix-kod',
  price_recommended: 'Sotuv narxi', price_min: 'Minimal narx', price_partner: 'Hamkor narxi',
  quantity: 'Miqdor', cost_price: 'Tannarx', currency: 'Valyuta', unit: 'Birlik',
  expires_on: 'Yaroqlilik sanasi', batch_code: 'Partiya',
};
const columns = [
  { label: 'Mahsulot / Variant', render: (data) => <>{data.name} / {data.variant_name || 'Standart'}{data.barcode && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.barcode}</div>}</> },
  { label: 'Kategoriya', render: (data) => data.category },
  { label: 'Narx', render: (data) => <>{Number(data.price_recommended || 0).toLocaleString()} {data.currency || 'UZS'}</> },
  { label: 'Miqdor', render: (data) => <>{data.quantity || 0} {data.unit || 'dona'}</> },
];

export default function CatalogImportModal(props) {
  const { isOwner } = useAuth();
  return <SpreadsheetImportModal {...props} api={catalogApi} canDownloadTemplate={isOwner}
    title="Excel / CSV fayldan mahsulot yuklash" templateFilename="ilbi-import-shablon.xlsx"
    fieldNames={fieldNames} columns={columns} entityLabel="mahsulot"
    requiredFields="mahsulot, kategoriya, sotuv_narxi"
    prepareHint="Tayyor namunaviy Excel faylini yuklab oling va tovarlaringizni kiriting." />;
}
