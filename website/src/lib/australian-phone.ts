export const defaultAustralianPhone = "+61 ";

export function formatAustralianPhoneInput(value: string): string {
  const trimmed = value.trim();
  let digits = value.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.startsWith("61")) {
    digits = digits.slice(2);
  } else if (digits.length > 9 && digits.startsWith("61")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);

  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)]
    .filter(Boolean)
    .join(" ");

  return `+61 ${groups}`;
}

export function isAustralianPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s()-]/g, "");
  return /^(?:[1-9]\d{8}|0\d{9}|\+61\d{9})$/.test(compact);
}
