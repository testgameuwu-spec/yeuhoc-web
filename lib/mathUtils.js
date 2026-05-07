export function checkSAEquivalent(ua, ans) {
  if (ua === undefined || ua === null || ans === undefined || ans === null) return false;

  const cleanUa = normalizeSAAnswer(ua);
  const cleanAns = normalizeSAAnswer(ans);

  if (cleanUa === cleanAns) return true;

  const numUa = parseSANumber(cleanUa);
  const numAns = parseSANumber(cleanAns);

  if (Number.isFinite(numUa) && Number.isFinite(numAns) && Math.abs(numUa - numAns) < 1e-6) {
    return true;
  }

  return false;
}

function normalizeSAAnswer(value) {
  let s = value.toString().trim().toLowerCase();

  s = s.replace(/\u2212/g, '-');
  s = s.replace(/^\$+|\$+$/g, '');
  s = s.replace(/^\\\(([\s\S]*)\\\)$/g, '$1');
  s = s.replace(/^\\\[([\s\S]*)\\\]$/g, '$1');
  s = s.replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b/g, '');
  s = s.replace(/\\(?:left|right)\b/g, '');
  s = unwrapLatexCommand(s, 'boxed');
  s = unwrapLatexCommand(s, 'text');
  s = s.replace(/\s+/g, '');
  s = s.replace(/\\(?:dfrac|tfrac|cfrac|frac)\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');

  return s;
}

function unwrapLatexCommand(value, command) {
  const prefix = `\\${command}{`;
  let s = value.trim();

  while (s.startsWith(prefix) && s.endsWith('}')) {
    const inner = s.slice(prefix.length, -1);
    if (!hasBalancedBraces(inner)) break;
    s = inner.trim();
  }

  return s;
}

function hasBalancedBraces(value) {
  let depth = 0;

  for (const ch of value) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) return false;
  }

  return depth === 0;
}

function parseSANumber(value) {
  const s = stripOuterParens(value.replace(',', '.'));

  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);

  const parts = splitTopLevelFraction(s);
  if (parts) {
    const num = parseSANumber(parts[0]);
    const den = parseSANumber(parts[1]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }

  return NaN;
}

function splitTopLevelFraction(value) {
  let depth = 0;
  let slashIndex = -1;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth--;
    else if (ch === '/' && depth === 0) {
      if (slashIndex !== -1) return null;
      slashIndex = i;
    }
  }

  if (slashIndex <= 0 || slashIndex >= value.length - 1) return null;

  return [
    stripOuterParens(value.slice(0, slashIndex)),
    stripOuterParens(value.slice(slashIndex + 1)),
  ];
}

function stripOuterParens(value) {
  let s = value.trim();

  while (s.startsWith('(') && s.endsWith(')')) {
    const inner = s.slice(1, -1);
    if (!hasBalancedParens(inner)) break;
    s = inner.trim();
  }

  return s;
}

function hasBalancedParens(value) {
  let depth = 0;

  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return false;
  }

  return depth === 0;
}
