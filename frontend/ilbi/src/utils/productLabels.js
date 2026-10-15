import JsBarcode from 'jsbarcode';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function barcodeSvg(code) {
  if (!code || !/^[\x20-\x7e]+$/.test(code)) throw new Error('Shtrix-kod faqat lotin harflari, raqam va belgilaridan iborat bo‘lishi kerak.');
  const target = {};
  JsBarcode(target, code, { format: 'CODE128', displayValue: false });
  const bits = target.encodings.map(encoding => encoding.data).join('');
  const width = bits.length + 20; // Ten modules of quiet space on either side.
  const bars = [...bits].map((bit, index) => bit === '1' ? `<rect x="${index + 10}" y="0" width="1" height="50"/>` : '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 50" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(code)}"><rect width="${width}" height="50" fill="white"/><g fill="black">${bars}</g></svg>`;
}

export function labelDocument(variant, { format, width, height, copies, showName, showPrice }) {
  const w = Number(width), h = Number(height), count = Number(copies);
  if (!Number.isFinite(w) || w < 30 || w > 190 || !Number.isFinite(h) || h < 20 || h > 100 || !Number.isInteger(count) || count < 1 || count > 200) {
    throw new Error('O‘lcham: eni 30–190 mm, bo‘yi 20–100 mm. Nusxa: 1–200.');
  }
  if (h < (showName && showPrice ? 28 : showName || showPrice ? 23 : 20)) {
    throw new Error('Yozuvlar sig‘ishi uchun kattaroq bo‘y tanlang yoki nom va narxni o‘chiring.');
  }
  const svg = barcodeSvg(variant.barcode);
  const modules = Number(svg.match(/viewBox="0 0 (\d+) 50"/)[1]);
  const minimumWidth = Math.ceil((modules * 0.2 + 3) * 10) / 10;
  if (w < minimumWidth) throw new Error(`Shtrix-kod siqilib qolmasligi uchun yorliq enini kamida ${minimumWidth} mm qiling.`);
  const name = `${variant.product_name || variant.name}${variant.product_name && variant.name !== 'Standart' ? ` / ${variant.name}` : ''}`;
  const price = `${Number(variant.price_recommended || 0).toLocaleString('uz-UZ')} ${variant.currency || 'UZS'}`;
  const label = `<article class="label">${showName ? `<div class="name">${escapeHtml(name)}</div>` : ''}${svg}<div class="code">${escapeHtml(variant.barcode)}</div>${showPrice ? `<div class="price">${escapeHtml(price)}</div>` : ''}</article>`;
  const perPage = format === 'a4' ? Math.floor(190 / w) * Math.floor(277 / h) : 1;
  const pages = [];
  for (let start = 0; start < count; start += perPage) {
    pages.push(`<section class="sheet">${label.repeat(Math.min(perPage, count - start))}</section>`);
  }
  return `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><title>Mahsulot yorliqlari</title><style>
    @page { size: ${format === 'a4' ? 'A4' : `${w}mm ${h}mm`}; margin: ${format === 'a4' ? '10mm' : '0'}; }
    * { box-sizing: border-box; } body { margin: 0; background: white; color: black; font-family: Arial,sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(${format === 'a4' ? Math.floor(190 / w) : 1}, ${w}mm); align-content: start; break-after: page; }
    .sheet:last-child { break-after: auto; }
    .label { width: ${w}mm; height: ${h}mm; padding: 1.5mm; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: .7mm; overflow: hidden; break-inside: avoid; }
    svg { width: 100%; min-height: 7mm; height: ${Math.max(7, Math.min(15, h * .4))}mm; flex-shrink: 0; }
    .name { font-size: 9pt; line-height: 1.1; width: 100%; text-align: center; max-height: 7mm; overflow: hidden; }
    .code { font: 7pt monospace; } .price { font-weight: bold; font-size: 10pt; }
  </style></head><body>${pages.join('')}</body></html>`;
}

export function printLabelDocument(html) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;border:0';
  frame.title = 'Mahsulot yorliqlarini chop etish';
  frame.onload = () => {
    frame.contentWindow.onafterprint = () => setTimeout(() => frame.remove(), 1000);
    frame.contentWindow.focus();
    frame.contentWindow.print();
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}
