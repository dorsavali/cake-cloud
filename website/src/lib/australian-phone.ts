export const defaultInternationalPhone = "";

export function formatInternationalPhoneInput(value: string): string {
  const hasLeadingPlus = value.trimStart().startsWith("+");
  const allowed = value.replace(/[^\d\s().-]/g, "").slice(0, 30);
  return `${hasLeadingPlus ? "+" : ""}${allowed}`;
}

export function normalizeInternationalPhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^[1-9]\d{8}$/.test(digits)) return `+61${digits}`;
  return "";
}

export function isInternationalPhone(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalizeInternationalPhone(value));
}
