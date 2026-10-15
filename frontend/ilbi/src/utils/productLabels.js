import JsBarcode from 'jsbarcode';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function calculateEanCheckDigit(digits12) {
  const str = String(digits12 || '').replace(/\D/g, '').slice(0, 12);
  const sum = str
    .split('')
    .reduce((acc, d, idx) => acc + Number(d) * (idx % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function formatLabelPrice(val, cur = 'UZS') {
  const n = Number(val || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  return cur === 'USD'
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${n.toLocaleString('uz-UZ')} so‘m`;
}

export function barcodeSvg(code) {
  if (!code || !/^[\x20-\x7e]+$/.test(code)) {
    throw new Error('Shtrix-kod faqat lotin harflari, raqam va belgilaridan iborat bo‘lishi kerak.');
  }

  const isEan = /^\d{12,13}$/.test(code);
  if (isEan) {
    let eanCode = code;
    if (eanCode.length === 12) {
      eanCode += calculateEanCheckDigit(eanCode);
    } else {
      const validCheck = calculateEanCheckDigit(eanCode);
      if (eanCode[12] !== validCheck) {
        eanCode = eanCode.slice(0, 12) + validCheck;
      }
    }

    const target = {};
    JsBarcode(target, eanCode, {
      format: 'EAN13',
      displayValue: true,
      height: 40,
    });

    const quietZone = 11;
    let curX = quietZone;
    const rects = [];
    const texts = [];

    // First digit is placed in the left quiet zone before the start guard
    if (target.encodings[0]?.text) {
      texts.push(
        `<text x="5" y="50.5" text-anchor="middle" font-family="'JetBrains Mono', 'SF Mono', Consolas, monospace" font-size="11" font-weight="700">${escapeHtml(target.encodings[0].text)}</text>`
      );
    }

    // Process start guard, left digits, center guard, right digits, end guard
    for (let eIdx = 1; eIdx < target.encodings.length; eIdx++) {
      const enc = target.encodings[eIdx];
      const isGuard = enc.options.height > 40;
      // Guard bars (start 101, center 01010, end 101) extend down past normal data bars
      const barHeight = isGuard ? 48 : 38;
      for (let i = 0; i < enc.data.length; i++) {
        if (enc.data[i] === '1') {
          rects.push(`<rect x="${curX + i}" y="2" width="1" height="${barHeight}"/>`);
        }
      }
      if (enc.text) {
        const posX = curX + enc.data.length / 2;
        texts.push(
          `<text x="${posX.toFixed(1)}" y="50.5" text-anchor="middle" font-family="'JetBrains Mono', 'SF Mono', Consolas, monospace" font-size="11" font-weight="700">${escapeHtml(enc.text)}</text>`
        );
      }
      curX += enc.data.length;
    }

    const totalWidth = curX + quietZone; // 11 + 95 + 11 = 117 modules (center guard at 58.5 / 117 = 50.0% center)

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 54" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${escapeHtml(code)}"><rect width="${totalWidth}" height="54" fill="white"/><g fill="black">${rects.join('')}</g><g fill="black">${texts.join('')}</g></svg>`;
  }

  // Code 128 fallback for alphanumeric or non-EAN codes
  const target = {};
  JsBarcode(target, code, { format: 'CODE128', displayValue: false });
  const bits = target.encodings.map(encoding => encoding.data).join('');
  const width = bits.length + 20; // Ten modules of quiet space on either side.
  const bars = [...bits].map((bit, index) => bit === '1' ? `<rect x="${index + 10}" y="0" width="1" height="50"/>` : '').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 50" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${escapeHtml(code)}"><rect width="${width}" height="50" fill="white"/><g fill="black">${bars}</g></svg>`;
}

export function labelDocument(variant, { format, width, height, copies, showName = true, showPrice = false }, { preview = false } = {}) {
  const w = Number(width), h = Number(height), count = Number(copies);
  if (!Number.isFinite(w) || w < 30 || w > 190 || !Number.isFinite(h) || h < 20 || h > 100 || !Number.isInteger(count) || count < 1 || count > 200) {
    throw new Error('O‘lcham: eni 30–190 mm, bo‘yi 20–100 mm. Nusxa: 1–200.');
  }
  if (showName && h < 23) {
    throw new Error('Mahsulot nomi sig‘ishi uchun bo‘yni kamida 23 mm qiling yoki nomni o‘chiring.');
  }
  const svg = barcodeSvg(variant.barcode);
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const modules = match ? Number(match[1]) : 100;
  const minimumWidth = Math.ceil((modules * 0.2 + 3) * 10) / 10;
  if (w < minimumWidth) throw new Error(`Shtrix-kod siqilib qolmasligi uchun yorliq enini kamida ${minimumWidth} mm qiling.`);

  const isEan = /^\d{12,13}$/.test(variant.barcode);
  const name = [variant.product_name, variant.name && variant.name !== 'Standart' && variant.name !== variant.product_name ? variant.name : ''].filter(Boolean).join(' / ') || variant.name || '';
  const priceVal = variant.price_recommended || variant.price_min || variant.price_partner || variant.price;
  const priceFormatted = showPrice && priceVal ? formatLabelPrice(priceVal, variant.currency) : '';

  const nameHtml = showName ? `<div class="name">${escapeHtml(name)}</div>` : '';
  const priceHtml = priceFormatted ? `<div class="price">${escapeHtml(priceFormatted)}</div>` : '';
  // For non-EAN codes (e.g. INV-5-20002), code text is rendered separately. For EAN-13, the numbers are integrated inside the SVG between guard bars
  const codeHtml = `<div class="code"${isEan ? ' style="display:none"' : ''}>${escapeHtml(variant.barcode)}</div>`;

  const label = `<article class="label">${nameHtml}<div class="barcode-wrap">${svg}</div>${codeHtml}${priceHtml}</article>`;
  const perPage = format === 'a4' ? Math.floor(190 / w) * Math.floor(277 / h) : 1;
  const pages = [];
  for (let start = 0; start < count; start += perPage) {
    pages.push(`<section class="sheet">${label.repeat(Math.min(perPage, count - start))}</section>`);
  }
  return `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><title>Mahsulot yorliqlari</title><style>
    @page { size: ${format === 'a4' ? 'A4' : `${w}mm ${h}mm`}; margin: ${format === 'a4' ? '10mm' : '0'}; }
    :root { --unit: 1mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: white; color: black; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .sheet { display: grid; grid-template-columns: repeat(${format === 'a4' ? Math.floor(190 / w) : 1}, ${w}mm); align-content: start; break-after: page; }
    .sheet:last-child { break-after: auto; }
    .label { width: calc(${w} * var(--unit)); height: calc(${h} * var(--unit)); padding: calc(1.5 * var(--unit)) calc(2 * var(--unit)); display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: calc(.4 * var(--unit)); overflow: hidden; break-inside: avoid; }
    .name { flex-shrink: 0; font-size: calc(3.175 * var(--unit)); font-weight: 700; line-height: 1.15; width: 100%; text-align: center; max-height: calc(7 * var(--unit)); overflow: hidden; overflow-wrap: anywhere; }
    .barcode-wrap { flex: 1 1 0; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; }
    svg { display: block; width: 100%; height: 100%; max-height: calc(${Math.min(h * 0.52, 22)} * var(--unit)); }
    .code { flex-shrink: 0; font: 700 calc(2.82 * var(--unit))/1.15 monospace; text-align: center; white-space: nowrap; letter-spacing: 0.04em; }
    .price { flex-shrink: 0; font-size: calc(3.5 * var(--unit)); font-weight: 800; line-height: 1.1; width: 100%; text-align: center; white-space: nowrap; }
    @media screen {
      body.preview { height: 100vh; --unit: min(calc(100vw / ${w}), calc(100vh / ${h})); }
      .preview .sheet { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    }
  </style></head><body${preview ? ' class="preview"' : ''}>${pages.join('')}</body></html>`;
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
