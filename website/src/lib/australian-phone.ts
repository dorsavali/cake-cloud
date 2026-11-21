export const australianPhonePattern =
  String.raw`(?:0[23478]|\+61[23478])(?:[\s()-]*\d){8}`;

export function isAustralianPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s()-]/g, "");
  return /^(?:0[23478]\d{8}|\+61[23478]\d{8})$/.test(compact);
}
