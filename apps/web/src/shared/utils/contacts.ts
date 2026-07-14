export function normalizeRuPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return null;
}

export function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

export function lastFourPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
