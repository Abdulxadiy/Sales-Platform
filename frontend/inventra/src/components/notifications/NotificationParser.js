/**
 * Notification Parser Utility
 * Converts raw Telegram markdown & structured notification strings into clean objects for UI rendering.
 */

export function parseAmount(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[UZS$\s,]/gi, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatTafovut(diffUzsStr, diffUsdStr, diffReason) {
  const numUzs = parseAmount(diffUzsStr);
  const numUsd = parseAmount(diffUsdStr);

  const hasDiffUzs = Math.abs(numUzs) > 0.01;
  const hasDiffUsd = Math.abs(numUsd) > 0.01;

  if (!hasDiffUzs && !hasDiffUsd && !diffReason) {
    return {
      isZero: true,
      text: "0 UZS (Tafovut yo‘q — Kassa to‘liq)",
      diffDisplay: "0 UZS",
      label: "Kassa to‘liq",
      type: "success",
    };
  }

  const parts = [];
  if (hasDiffUzs) {
    const sign = numUzs > 0 ? "+" : "";
    parts.push(`${sign}${Math.round(numUzs).toLocaleString('uz-UZ')} UZS`);
  }
  if (hasDiffUsd) {
    const sign = numUsd > 0 ? "+$" : "-$";
    parts.push(`${sign}${Math.abs(numUsd).toFixed(2)}`);
  }

  const isDeficit = numUzs < -0.01 || numUsd < -0.01;
  const isSurplus = numUzs > 0.01 || numUsd > 0.01;
  const label = isDeficit && isSurplus ? "Tafovut" : isDeficit ? "Kamomad" : "Ortiqcha";

  const diffDisplay = parts.length > 0 ? parts.join(" / ") : "Tafovut aniqlandi";

  return {
    isZero: false,
    text: `${diffDisplay} (${label})`,
    diffDisplay,
    label,
    type: "error",
  };
}

export function parseZReport(text) {
  if (!text || typeof text !== 'string') return null;
  if (!text.includes('KUNLIK Z-HISOBOT') && !text.includes('Z-Hisobot') && !text.includes('Z-HISOBOT')) {
    return null;
  }

  const getMatch = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };

  const reportIdMatch = text.match(/#(\d+)|#Z-(\d+)/i);
  const reportId = reportIdMatch ? (reportIdMatch[1] || reportIdMatch[2]) : null;

  const shop = getMatch(/[🏢🏬]\s*\*Do['’]kon:\*\s*(.+)/);
  const datetime = getMatch(/📅\s*\*Sana:\*\s*(.+)/);
  const seller = getMatch(/👤\s*\*Smenani yopdi:\*\s*(.+)/);

  // Cash expected / actual / diff
  const expectedMatch = text.match(/[•\-]\s*Kutilgan:\s*`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/);
  const actualMatch = text.match(/[•\-]\s*Haqiqiy:\s*`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/);
  const diffMatch = text.match(/[•\-]\s*Tafovut(?:\s*\(Farq\))?:\s*`?([^`—_|\n]+)`?(?:\s*\|\s*`?([^`—_|\n]+)`?)?/);
  const diffStatus = getMatch(/[✅⚠️]\s*\*Tafovut holati:\*\s*(.+)/);
  const diffReason = getMatch(/⚠️\s*\*Tafovut izohi:\*\s*(.+)/);

  // Sales
  const saleCash = text.match(/[•\-]\s*Naqd:\s*`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/);
  const saleCard = text.match(/[•\-]\s*Karta:\s*`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/);
  const saleDebt = text.match(/[•\-]\s*Nasiya:\s*`([^`]+)`(?:\s*\|\s*`([^`]+)`)?/);

  // Incomes total & items
  const incomeTotalMatch = text.match(/📥\s*\*(?:QO['’]SHIMCHA KIRIMLAR|Qo['’]shimcha kirim):\*\s*(?:`([^`]+)`|([^\n|]+))(?:\s*\|\s*(?:`([^`]+)`|([^\n]+)))?/);
  const expenseTotalMatch = text.match(/📤\s*\*(?:XARAJATLAR \/ CHIQIMLAR|Xarajatlar):\*\s*(?:`([^`]+)`|([^\n|]+))(?:\s*\|\s*(?:`([^`]+)`|([^\n]+)))?/);

  // Extract income items if any
  const incomeSectionMatch = text.match(/📥\s*\*(?:QO['’]SHIMCHA KIRIMLAR|Qo['’]shimcha kirim):\*[\s\S]*?(?=📤|$)/);
  const incomeItems = [];
  if (incomeSectionMatch) {
    const lines = incomeSectionMatch[0].split('\n').slice(1);
    for (const l of lines) {
      const im = l.trim().match(/^[•\-]\s*\*([^*:]+):?\*?:?\s*`?([^`—_]+)`?(?:\s*—\s*_([^_\n]+)_)?/);
      if (im) {
        incomeItems.push({
          name: im[1].trim(),
          amount: (im[2] || '').trim(),
          note: (im[3] || '').trim(),
        });
      }
    }
  }

  // Extract expense items if any
  const expenseSectionMatch = text.match(/📤\s*\*(?:XARAJATLAR \/ CHIQIMLAR|Xarajatlar):\*[\s\S]*?(?=📝|$)/);
  const expenseItems = [];
  if (expenseSectionMatch) {
    const lines = expenseSectionMatch[0].split('\n').slice(1);
    for (const l of lines) {
      const em = l.trim().match(/^[•\-]\s*\*([^*:]+):?\*?:?\s*`?([^`—_]+)`?(?:\s*—\s*_([^_\n]+)_)?/);
      if (em) {
        expenseItems.push({
          name: em[1].trim(),
          amount: (em[2] || '').trim(),
          note: (em[3] || '').trim(),
        });
      }
    }
  }

  const staffNotes = getMatch(/📝\s*\*Xodim qo['’]shimchasi:\*\s*(.+)/);

  const diffUzsRaw = diffMatch?.[1] || '0.00 UZS';
  const diffUsdRaw = diffMatch?.[2] || '$0.00';
  const tafovut = formatTafovut(diffUzsRaw, diffUsdRaw, diffReason);

  return {
    isZReport: true,
    id: reportId,
    shop: shop || "Do'kon",
    datetime: datetime || '',
    seller: seller || '',
    cash: {
      expectedUzs: (expectedMatch?.[1] || '0.00 UZS').trim(),
      expectedUsd: (expectedMatch?.[2] || '$0.00').trim(),
      actualUzs: (actualMatch?.[1] || '0.00 UZS').trim(),
      actualUsd: (actualMatch?.[2] || '$0.00').trim(),
      diffUzs: diffUzsRaw.trim(),
      diffUsd: diffUsdRaw.trim(),
      diffStatus: diffStatus || (diffReason ? 'Tafovut mavjud' : "Tafovut mavjud emas (Kassa to'liq)"),
      diffReason: diffReason || null,
    },
    tafovut,
    sales: {
      cashUzs: (saleCash?.[1] || '0.00 UZS').trim(),
      cashUsd: (saleCash?.[2] || '$0.00').trim(),
      cardUzs: (saleCard?.[1] || '0.00 UZS').trim(),
      cardUsd: (saleCard?.[2] || '$0.00').trim(),
      debtUzs: (saleDebt?.[1] || '0.00 UZS').trim(),
      debtUsd: (saleDebt?.[2] || '$0.00').trim(),
    },
    income: {
      totalUzs: (incomeTotalMatch?.[1] || incomeTotalMatch?.[2] || '0.00 UZS').trim(),
      totalUsd: (incomeTotalMatch?.[3] || incomeTotalMatch?.[4] || '$0.00').trim(),
      items: incomeItems,
    },
    expense: {
      totalUzs: (expenseTotalMatch?.[1] || expenseTotalMatch?.[2] || '0.00 UZS').trim(),
      totalUsd: (expenseTotalMatch?.[3] || expenseTotalMatch?.[4] || '$0.00').trim(),
      items: expenseItems,
    },
    staffNotes,
  };
}

/**
 * Format markdown text into react-safe tokens (bold, code, links, bullet points)
 */
export function formatMarkdownLine(text) {
  if (!text) return [];

  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  const tokenRegex = /(\*[^*]+\*|`[^`]+`|_[^_]+_)/;

  while (remaining.length > 0) {
    const match = remaining.match(tokenRegex);
    if (!match) {
      parts.push({ type: 'text', key: `t-${keyIdx++}`, content: remaining });
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      parts.push({
        type: 'text',
        key: `t-${keyIdx++}`,
        content: remaining.substring(0, matchIndex),
      });
    }

    const token = match[0];
    if (token.startsWith('*') && token.endsWith('*')) {
      parts.push({
        type: 'bold',
        key: `b-${keyIdx++}`,
        content: token.slice(1, -1),
      });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push({
        type: 'code',
        key: `c-${keyIdx++}`,
        content: token.slice(1, -1),
      });
    } else if (token.startsWith('_') && token.endsWith('_')) {
      parts.push({
        type: 'italic',
        key: `i-${keyIdx++}`,
        content: token.slice(1, -1),
      });
    } else {
      parts.push({ type: 'text', key: `t-${keyIdx++}`, content: token });
    }

    remaining = remaining.substring(matchIndex + token.length);
  }

  return parts;
}
