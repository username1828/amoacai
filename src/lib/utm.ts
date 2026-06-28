const UTM_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid", "ttclid",
  "sck", "xcod",
  "subid", "subid2", "subid3", "subid4", "subid5",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "amoacai:utm";

function safeStorage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function captureUtmsFromLocation(): UtmParams {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const stored: UtmParams = readUtms();
  const next: UtmParams = { ...stored };
  let changed = false;
  for (const key of UTM_KEYS) {
    const v = url.searchParams.get(key);
    if (v) {
      next[key] = v;
      if (stored[key] !== v) changed = true;
    }
  }
  if (changed) {
    const s = safeStorage();
    s?.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function readUtms(): UtmParams {
  if (typeof window === "undefined") return {};
  const s = safeStorage();
  try {
    const raw = s?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

export function appendUtmsToUrl(target: string): string {
  try {
    const utms = readUtms();
    const dest = new URL(target, typeof window !== "undefined" ? window.location.href : "https://x/");
    for (const [k, v] of Object.entries(utms)) {
      if (v && !dest.searchParams.has(k)) dest.searchParams.set(k, v);
    }
    return dest.toString();
  } catch {
    return target;
  }
}

/** Returns stored UTMs as a plain record, suitable for TanStack Router `search`. */
export function getUtmsSearchRecord(): Record<string, string> {
  const utms = readUtms();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(utms)) {
    if (v) out[k] = v;
  }
  return out;
}

/** Returns "?utm_source=...&..." (empty string if none). */
export function buildUtmQueryString(): string {
  const rec = getUtmsSearchRecord();
  const keys = Object.keys(rec);
  if (keys.length === 0) return "";
  const sp = new URLSearchParams(rec);
  return `?${sp.toString()}`;
}