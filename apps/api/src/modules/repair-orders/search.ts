export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function orderNumberSearchTerms(value: string) {
  const normalized = value.trim().replace(/^№\s*/i, "").replace(/^R-/i, "");
  const digits = normalized.replace(/\D/g, "");

  if (!digits) {
    return [];
  }

  const unpadded = digits.replace(/^0+/, "") || "0";
  const padded = unpadded.padStart(5, "0");

  return [...new Set([normalized, digits, unpadded, padded, `R-${digits}`, `R-${padded}`].filter(Boolean))];
}
