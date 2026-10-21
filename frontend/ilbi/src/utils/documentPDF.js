const PX_PER_MM = 96 / 25.4;

/** Download a prepared document locally; its contents never leave the browser. */
export async function downloadSharedDocument(prepared) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const invoice = prepared.format === 'invoice';
  const widthMm = invoice ? 210 : prepared.widthMm;
  const marginX = invoice ? 15 : 0;
  const marginY = invoice ? 12 : 0;
  const contentWidth = widthMm - marginX * 2;
  const frame = document.createElement('iframe');
  frame.title = 'Yuklab olish uchun PDF tayyorlash';
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', left: '-10000px', top: '0', width: `${contentWidth}mm`, height: '1px', border: '0', pointerEvents: 'none' });
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(prepared.html);
    doc.close();
    await doc.fonts?.ready;
    await Promise.all([...doc.images].map(img => img.decode()));
    const content = doc.getElementById('shared-document');
    const bounds = content.getBoundingClientRect();
    // Render one page at a time, keeping memory bounded even for a long sale.
    const totalHeight = Math.ceil(bounds.height);
    const pageCapacity = Math.floor((invoice ? 273 : 1000) * PX_PER_MM);
    const protectedBlocks = [...content.querySelectorAll('tr, .invoice-summary-block, .invoice-signatures-block, .receipt-footer-section, .receipt-qr-card, .receipt-barcode-wrap')].map(node => {
      const rect = node.getBoundingClientRect();
      return { top: Math.floor(rect.top - bounds.top), bottom: Math.ceil(rect.bottom - bounds.top) };
    });
    let start = 0, pdf;
    while (start < totalHeight) {
      let end = Math.min(totalHeight, start + pageCapacity);
      // Move a row, total or signature together onto the following page.
      for (const block of protectedBlocks) {
        if (block.top > start && block.top < end && block.bottom > end && block.bottom - block.top <= pageCapacity) end = block.top;
      }
      const height = end - start;
      const pageHeightMm = invoice ? 297 : Math.max(30, height / PX_PER_MM + 4);
      const pageFormat = invoice ? 'a4' : [widthMm, pageHeightMm];
      const orientation = pageHeightMm < widthMm ? 'landscape' : 'portrait';
      if (pdf) pdf.addPage(pageFormat, orientation);
      else {
        pdf = new jsPDF({ unit: 'mm', format: pageFormat, orientation, compress: true });
        pdf.setProperties({ title: prepared.title, author: 'ILBI' });
      }
      const canvas = await html2canvas(content, {
        backgroundColor: '#ffffff', scale: 2.5, logging: false,
        width: bounds.width, height, y: start, scrollX: 0, scrollY: 0,
        windowWidth: Math.ceil(bounds.width), windowHeight: Math.max(1000, height),
      });
      pdf.addImage(canvas, 'PNG', marginX, marginY, contentWidth, height / PX_PER_MM, undefined, 'FAST');
      canvas.width = 0; canvas.height = 0;
      start = end;
    }
    const url = URL.createObjectURL(pdf.output('blob'));
    const link = document.createElement('a');
    link.href = url; link.download = prepared.filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally { frame.remove(); }
}
