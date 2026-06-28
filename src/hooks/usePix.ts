import { useCallback, useEffect, useRef, useState } from "react";

export type PixData = {
  qr_code: string;
  qr_code_image: string | null;
  external_id: string;
  amount: number;
  expires_at: string | null;
};

type Status = "idle" | "loading" | "ready" | "paid" | "error";

export function usePix() {
  const [status, setStatus] = useState<Status>("idle");
  const [pix, setPix] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const create = useCallback(async (amount: number, extras?: Record<string, unknown>) => {
    setStatus("loading");
    setError(null);
    setPix(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const resp = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, ...(extras || {}) }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao gerar PIX");
      setPix(data as PixData);
      setStatus("ready");
      return data as PixData;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar PIX";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  const startPolling = useCallback((hash: string, onPaid: () => void) => {
    stopPolling();
    const tick = async () => {
      try {
        const resp = await fetch(`/api/check-status?hash=${encodeURIComponent(hash)}`);
        const data = await resp.json();
        if (data?.status === "paid") {
          stopPolling();
          setStatus("paid");
          onPaid();
        }
      } catch {
        /* swallow transient errors */
      }
    };
    pollRef.current = window.setInterval(tick, 3000);
    void tick();
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setPix(null);
    setError(null);
    setStatus("idle");
  }, [stopPolling]);

  return { status, pix, error, create, startPolling, stopPolling, reset };
}