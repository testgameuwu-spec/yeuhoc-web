export function checkSAEquivalent(ua, ans) {
  if (ua === undefined || ua === null || ans === undefined || ans === null) return false;
  
  const cleanUa = ua.toString().trim().toLowerCase();
  const cleanAns = ans.toString().trim().toLowerCase();
  
  if (cleanUa === cleanAns) return true;

  const parseNum = (str) => {
    let s = str.replace(/\s+/g, '');
    
    // Remove all $ symbols and formatting wrappers
    s = s.replace(/\$/g, '');
    s = s.replace(/\\displaystyle/g, '');
    
    // Convert LaTeX \frac{a}{b} to a/b
    s = s.replace(/\\frac{([^{}]+)}{([^{}]+)}/g, '$1/$2');
    
    if (/^-?\d+,\d+$/.test(s)) {
      s = s.replace(',', '.');
    }
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 2) {
        const num = Number(parts[0]);
        const den = Number(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
      }
    }
    return Number(s);
  };

  const numUa = parseNum(cleanUa);
  const numAns = parseNum(cleanAns);

  if (!isNaN(numUa) && !isNaN(numAns) && Math.abs(numUa - numAns) < 1e-6) {
    return true;
  }

  // Also fallback to remove all spaces to check something like "x = 5" vs "x=5"
  if (cleanUa.replace(/\s+/g, '') === cleanAns.replace(/\s+/g, '')) {
    return true;
  }

  return false;
}
