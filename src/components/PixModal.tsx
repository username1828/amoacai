import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X, Check } from "lucide-react";
import QRCode from "qrcode";
import { usePix } from "@/hooks/usePix";
import { formatBRL } from "@/lib/products";
import { track } from "@/lib/tracking";

function preserveParamsRedirect(target: string) {
  try {
    const current = new URL(window.location.href);
    const dest = new URL(target, window.location.origin);
    current.searchParams.forEach((v, k) => {
      if (!dest.searchParams.has(k)) dest.searchParams.set(k, v);
    });
    window.location.href = dest.toString();
  } catch {
    window.location.href = target;
  }
}

function useCountdown(expiresAt: string | null) {
  const target = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : Date.now() + 15 * 60 * 1000), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Props = { amount: number; onClose: () => void; extras?: Record<string, unknown> };

export function PixModal({ amount, onClose, extras }: Props) {
  const { status, pix, error, create, startPolling, reset } = usePix();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(pix?.expires_at ?? null);

  useEffect(() => { void create(amount, extras); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!pix) return;
    track("payment_initiated", { external_id: pix.external_id, amount: pix.amount });
    if (pix.qr_code_image) {
      const src = pix.qr_code_image.startsWith("data:") || pix.qr_code_image.startsWith("http")
        ? pix.qr_code_image
        : `data:image/png;base64,${pix.qr_code_image}`;
      setQrDataUrl(src);
    } else {
      QRCode.toDataURL(pix.qr_code, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
    startPolling(pix.external_id, () => {
      track("payment_approved", { external_id: pix.external_id, amount: pix.amount });
      setTimeout(() => preserveParamsRedirect("/success"), 1400);
    });
  }, [pix, startPolling]);

  const copy = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const retry = () => { reset(); void create(amount, extras); };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-bold">Pague com PIX</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-secondary grid place-items-center" aria-label="Fechar"><X size={18} strokeWidth={2.25} /></button>
        </div>

        <div className="p-5">
          {status === "loading" && (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="mt-4 text-sm text-muted-foreground">Gerando seu PIX...</p>
            </div>
          )}

          {status === "error" && (
            <div className="py-10 text-center">
              <AlertTriangle size={40} className="mx-auto mb-2 text-destructive" strokeWidth={2} />
              <p className="text-sm font-semibold">Não foi possível gerar o PIX</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button onClick={retry} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
                Tentar novamente
              </button>
            </div>
          )}

          {status === "paid" && (
            <div className="py-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent grid place-items-center text-accent-foreground animate-in zoom-in"><Check size={32} strokeWidth={2.75} /></div>
              <p className="mt-4 text-base font-bold text-accent">Pagamento aprovado!</p>
              <p className="text-xs text-muted-foreground mt-1">Redirecionando...</p>
            </div>
          )}

          {(status === "ready") && pix && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Valor</div>
                <div className="text-2xl font-extrabold text-primary">{formatBRL(pix.amount)}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Expira em <span className="font-bold text-foreground">{countdown}</span></div>
              </div>

              {qrDataUrl && (
                <div className="mx-auto w-fit rounded-xl border border-border bg-white p-3">
                  <img src={qrDataUrl} alt="QR Code PIX" className="h-56 w-56" />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Código copia e cola</label>
                <div className="mt-1 rounded-xl border border-border bg-muted p-2 text-[11px] break-all font-mono max-h-24 overflow-y-auto">
                  {pix.qr_code}
                </div>
                <button onClick={copy} className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
                  {copied ? "Copiado!" : "Copiar código"}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Aguardando pagamento...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}