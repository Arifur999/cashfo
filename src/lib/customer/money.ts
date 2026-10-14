// The API takes amounts with at most two decimals (0.01 up to
// 999,999,999,999.99); a third decimal was only refused after submitting,
// with the validator's own wording. Money inputs pass every keystroke through
// this, so a third decimal can't be typed in the first place.
export function limitMoneyDecimals(value: string): string {
  const match = /^(-?\d*)(\.\d{0,2})?\d*$/.exec(value);
  if (!match || !value.includes(".")) return value;
  return `${match[1]}${match[2] ?? ""}`;
}
