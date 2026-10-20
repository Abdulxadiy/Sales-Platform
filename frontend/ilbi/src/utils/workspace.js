export function canUse(tenant, ...codes) {
  return Boolean(tenant?.is_owner || tenant?.permissions?.includes('*') || codes.some(code => tenant?.permissions?.includes(code)));
}

export function calculateExpression(input) {
  const source = String(input).replaceAll('×', '*').replaceAll('÷', '/').replaceAll(',', '.').replace(/\s/g, '');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/()-]/g) || [];
  if (!source || tokens.join('') !== source || tokens.length > 100) throw new Error('To‘g‘ri hisob kiriting.');
  let index = 0;
  function parse(minimum = 0) {
    const token = tokens[index++];
    let result;
    if (token === '+' || token === '-') result = (token === '-' ? -1 : 1) * parse(3);
    else if (token === '(') {
      result = parse();
      if (tokens[index++] !== ')') throw new Error('Qavslarni tekshiring.');
    } else {
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error('Son kiriting.');
      result = Number(token);
    }
    while (index < tokens.length) {
      const op = tokens[index];
      const precedence = op === '+' || op === '-' ? 1 : op === '*' || op === '/' ? 2 : 0;
      if (!precedence || precedence < minimum) break;
      index++;
      const right = parse(precedence + 1);
      if (op === '/' && right === 0) throw new Error('Nolga bo‘lib bo‘lmaydi.');
      result = op === '+' ? result + right : op === '-' ? result - right : op === '*' ? result * right : result / right;
    }
    return result;
  }
  const result = parse();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Hisobni tekshiring.');
  return Number(result.toPrecision(12));
}
