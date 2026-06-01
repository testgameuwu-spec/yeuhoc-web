export function formatScore(value, digits = 2) {
  const number = Number(value);
  return (Number.isFinite(number) ? number : 0).toFixed(digits);
}
