export const PUBLIC_RECEIPT_ORIGIN = 'https://new-dev.site';

export function receiptShareURL(token, { origin = globalThis.location?.origin, desktop = Boolean(globalThis.window?.ilbiDesktop) } = {}) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  let base = PUBLIC_RECEIPT_ORIGIN;
  if (!desktop && origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === 'https:' && !url.username && !url.password && !/^(localhost|127\.|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) base = url.origin;
    } catch { /* A local preview still uses the public cloud origin. */ }
  }
  return `${base}/r/${encodeURIComponent(token)}`;
}

export function documentFilename(title) {
  const safe = Array.from(String(title || 'ILBI-hujjat'), character => character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character).join('');
  return safe.replace(/[. ]+$/g, '').slice(0, 140) || 'ILBI-hujjat';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Export only the visible document, including inline QR codes and drawn signatures. */
export async function prepareSharedDocument({ elementId, title, format = 'receipt', paperWidth = '58mm' }) {
  const source = document.getElementById(elementId);
  if (!source) throw new Error('Hujjat hali tayyor emas. Uni qayta ochib ko‘ring.');
  const invoice = format === 'invoice';
  const width = invoice ? '210mm' : paperWidth === '80mm' ? '80mm' : '58mm';
  const clone = source.cloneNode(true);
  clone.querySelectorAll('script, iframe, object, embed, link, meta, style, button, input, select, textarea, .no-print').forEach(node => node.remove());
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || ['srcdoc', 'href', 'xlink:href', 'srcset'].includes(attribute.name)) node.removeAttribute(attribute.name);
    }
    if (node.tagName === 'IMG' && !/^data:image\/(png|jpeg|webp);base64,/i.test(node.getAttribute('src') || '')) {
      throw new Error('Hujjat rasmlari hali tayyor emas. Birozdan keyin qayta urinib ko‘ring.');
    }
  }
  const frame = document.createElement('iframe');
  frame.title = 'Ulashish uchun hujjat tayyorlash';
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', left: '-10000px', top: '0', width, height: '1px', border: '0', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><title>${escapeHTML(title)}</title><style>
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff!important;color:#111!important;width:100%;font-family:${invoice ? 'Arial,sans-serif' : 'Consolas,"Courier New",monospace'};-webkit-print-color-adjust:exact;print-color-adjust:exact}
      #shared-document{width:100%;margin:0;padding:${invoice ? '0' : '1mm 2mm'}}
      #shared-document>div{width:100%!important;max-width:none!important;min-height:0!important;margin:0!important;box-shadow:none!important;border-radius:0!important}
      ${invoice ? '#shared-document>div{padding:0!important}' : ''}
      table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr,.invoice-summary-block,.invoice-signatures-block,.receipt-footer-section,.receipt-qr-card,.receipt-barcode-wrap{break-inside:avoid;page-break-inside:avoid}
      img,svg{max-width:100%}.no-print{display:none!important}
      .receipt-qr-card{display:block!important;width:max-content;max-width:100%;margin:0 auto}
      @page{size:${invoice ? 'A4' : `${width} 297mm`};margin:${invoice ? '12mm 15mm' : '0'}}
    </style><style id="shared-page-size"></style></head><body><main id="shared-document">${clone.outerHTML}</main></body></html>`);
    doc.close();
    await doc.fonts?.ready;
    try { await Promise.all([...doc.images].map(img => img.decode())); }
    catch { throw new Error('Hujjat rasmini tayyorlab bo‘lmadi. Hujjatni qayta ochib urinib ko‘ring.'); }
    const heightMm = invoice ? 297 : Math.max(30, Math.ceil(doc.getElementById('shared-document').getBoundingClientRect().height * 25.4 / 96) + 4);
    if (!invoice) doc.getElementById('shared-page-size').textContent = `@page{size:${width} ${heightMm}mm;margin:0}`;
    return { html: '<!doctype html>' + doc.documentElement.outerHTML, title: String(title).slice(0, 180), filename: documentFilename(title) + '.pdf', format: invoice ? 'invoice' : 'receipt', widthMm: invoice ? 210 : width === '80mm' ? 80 : 58, heightMm };
  } finally {
    frame.remove();
  }
}

export async function saveSharedDocument(options) {
  const prepared = await prepareSharedDocument(options);
  if (window.ilbiDesktop?.saveDocumentPDF) return window.ilbiDesktop.saveDocumentPDF(prepared);
  const { downloadSharedDocument } = await import('./documentPDF');
  await downloadSharedDocument(prepared);
  return { canceled: false };
}
