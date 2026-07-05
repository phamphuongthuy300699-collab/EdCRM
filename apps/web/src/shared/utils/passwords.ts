export function temporaryPortalPassword(prefix = "Roboks") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);

  globalThis.crypto.getRandomValues(bytes);

  const token = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `${prefix}-${token}`;
}
