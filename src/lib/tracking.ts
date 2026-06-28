import { readUtms } from "./utm";

export type TrackEvent =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "payment_initiated"
  | "payment_approved";

export function track(event: TrackEvent, data: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      event,
      ts: Date.now(),
      url: window.location.href,
      referrer: document.referrer || null,
      utm: readUtms(),
      data,
    });
    const url = "/api/tracking";
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* swallow */
  }
}