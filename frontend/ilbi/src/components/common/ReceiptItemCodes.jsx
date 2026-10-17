export default function ReceiptItemCodes({ item }) {
  if (!item.mxik && !item.package_code) return null;
  return (
    <div style={{ fontSize: '0.9em', marginTop: 2, overflowWrap: 'anywhere' }}>
      {item.mxik && <div>MXIK: {item.mxik}</div>}
      {item.package_code && <div>Qadoq: {item.package_code}</div>}
    </div>
  );
}
