/**
 * Human-friendly label from raw enum-ish values.
 * "diabetic_foot_ulcer" → "Diabetic Foot Ulcer", "pending_review" → "Pending Review",
 * "thin" → "Thin". Tokens that already contain capitals ("AIROS", "6P") pass through.
 */
export function humanizeLabel(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed
    .split(/[_\-\s]+/)
    .map((token) =>
      /[A-Z]/.test(token) ? token : token.charAt(0).toUpperCase() + token.slice(1),
    )
    .join(" ");
}
