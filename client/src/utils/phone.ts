/**
 * Phone formatting utilities for WhatsApp and tel: links.
 * Default country: Israel (+972)
 */

/** Format Israeli phone for WhatsApp (wa.me expects digits only, no +) */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Israeli: 05X → 9725X
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.substring(1);
  }
  // Ensure no + prefix for wa.me
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/** Build a wa.me URL, optionally with pre-filled text */
export function getWhatsAppUrl(phone: string, text?: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  let url = `https://wa.me/${formatted}`;
  if (text) url += `?text=${encodeURIComponent(text)}`;
  return url;
}

/** Build a tel: URL */
export function getTelUrl(phone: string): string {
  return `tel:${phone}`;
}
