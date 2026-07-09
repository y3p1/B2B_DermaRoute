const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]!);
}

const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^metadata\.google\.internal$/i,
];

export function isUrlSafe(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const hostname = parsed.hostname;
    return !BLOCKED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

export function escapeLikeWildcards(str: string): string {
  return str.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}
