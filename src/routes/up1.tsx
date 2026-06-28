import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePix } from "@/hooks/usePix";
import { appendUtmsToUrl, captureUtmsFromLocation, readUtms } from "@/lib/utm";
import { Check, AlertTriangle, Copy, ShieldCheck, Clock, ChevronRight, ArrowRight } from "lucide-react";

const FRETE_VALUE = 8.9;

export const Route = createFileRoute("/up1")({
  head: () => ({
    meta: [
      { title: "AmoAçaí — Confirmar Pedido" },
      { name: "description", content: "Confirme os dados de envio do seu pedido AmoAçaí." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Up1Page,
});

type Stage = "confirm" | "loadingConfirm" | "error" | "generating" | "pix" | "paid";

function useCountdown(expiresAt: string | null, fallbackMinutes = 30) {
  const target = useMemo(
    () => (expiresAt ? new Date(expiresAt).getTime() : Date.now() + fallbackMinutes * 60_000),
    [expiresAt, fallbackMinutes],
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type SavedCheckout = {
  customer?: { name?: string };
  address?: {
    cep?: string; street?: string; number?: string; complement?: string;
    district?: string; city?: string; state?: string; reference?: string;
  };
};

function getSavedCheckout(): SavedCheckout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("amoacai_checkout_v1");
    return raw ? (JSON.parse(raw) as SavedCheckout) : null;
  } catch { return null; }
}

function formatFullAddress(a?: SavedCheckout["address"]): string | null {
  if (!a || !a.street) return null;
  const line1 = `${a.street}${a.number ? ", " + a.number : ""}${a.complement ? " - " + a.complement : ""}`;
  const line2 = `${a.district ?? ""}${a.district && (a.city || a.state) ? " · " : ""}${a.city ?? ""}${a.state ? "/" + a.state : ""}`;
  return [line1, line2].filter(Boolean).join(" — ");
}

function getCityFallback(): string {
  if (typeof window === "undefined") return "sua região";
  try {
    const c = sessionStorage.getItem("amoacai:city");
    if (c) return c;
  } catch { /* ignore */ }
  return "sua região";
}

function Up1Page() {
  const [stage, setStage] = useState<Stage>("confirm");
  const [progress, setProgress] = useState(0);
  const [genStep, setGenStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState("Carregando endereço de entrega...");
  const [savedCheckout, setSavedCheckout] = useState<SavedCheckout | null>(null);
  const { status, pix, error, create, startPolling } = usePix();
  const startedRef = useRef(false);
  const countdown = useCountdown(pix?.expires_at ?? null);

  // Simulated address load on mount
  useEffect(() => {
    captureUtmsFromLocation();
    const t = setTimeout(() => {
      const saved = getSavedCheckout();
      setSavedCheckout(saved);
      const full = formatFullAddress(saved?.address);
      if (full) setAddressLabel(`Endereço confirmado: ${full}.`);
      else setAddressLabel(`Endereço confirmado em ${getCityFallback()}.`);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  // Confirm -> loading progress -> error
  const handleConfirm = () => {
    if (stage !== "confirm") return;
    setStage("loadingConfirm");
    const steps = [15, 35, 58, 74, 89, 100];
    const delays = [300, 600, 900, 1300, 1700, 2200];
    steps.forEach((val, i) => setTimeout(() => setProgress(val), delays[i]));
    setTimeout(() => setStage("error"), 2800);
  };

  // Error -> generating -> create PIX -> pix page
  const handlePagarFrete = () => {
    if (stage !== "error" || startedRef.current) return;
    startedRef.current = true;
    setStage("generating");
    setGenStep(1);
    [600, 1200, 1800, 2400].forEach((d, i) => setTimeout(() => setGenStep(i + 1), d));

    const utm = readUtms();
    void create(FRETE_VALUE, { utm, delivery_type: "entrega", description: "Taxa de entrega AmoAçaí" }).then((data) => {
      if (data) setStage("pix");
      else {
        startedRef.current = false;
        setStage("error");
      }
    });
  };

  // Generate QR + start polling when pix is ready
  useEffect(() => {
    if (!pix) return;
    if (pix.qr_code_image) {
      const src = pix.qr_code_image.startsWith("data:") || pix.qr_code_image.startsWith("http")
        ? pix.qr_code_image
        : `data:image/png;base64,${pix.qr_code_image}`;
      setQrDataUrl(src);
    } else {
      QRCode.toDataURL(pix.qr_code, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
    startPolling(pix.external_id, () => {
      setStage("paid");
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

  return (
    <div className="up1-root">
      <style>{UP1_CSS}</style>

      <header className="up1-header">
        <img src="/uploads/up1-logo.png" alt="AmoAçaí" />
      </header>

      <main className="up1-main">
        {(stage === "confirm" || stage === "loadingConfirm") && (
          <div className="up1-card">
            <div className="up1-banner">
              <div className="up1-check-circle">
                <Check size={36} strokeWidth={2.5} color="#fff" />
              </div>
              <p className="up1-banner-title">Confirme os dados de envio do seu pedido</p>
            </div>
            <div className="up1-body">
              <div className="up1-info-row">
                <span className={`up1-dot ${addressLabel.startsWith("Carregando") ? "gray" : ""}`} />
                <p className={`up1-info-text ${addressLabel.startsWith("Carregando") ? "up1-shimmer" : ""}`}>{addressLabel}</p>
              </div>
              <div className="up1-info-row">
                <span className="up1-dot" />
                <p className="up1-info-text">Seu pedido foi confirmado e já está em fase de <strong>preparação</strong>.</p>
              </div>
              <button className="up1-btn-primary" onClick={handleConfirm}>
                <span>CONFIRMAR</span>
                <span className="up1-btn-arrow"><ChevronRight size={16} strokeWidth={2.5} /></span>
              </button>
              <div className="up1-powered">
                <ShieldCheck size={14} strokeWidth={2} />
                © 2026 AmoAçaí
              </div>
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="up1-card up1-fade-in">
            <div className="up1-banner">
              <div className="up1-error-icon-wrap">
                <AlertTriangle size={36} strokeWidth={1.8} color="#fff" />
              </div>
              <p className="up1-banner-title">TAXA DE ENTREGA NECESSÁRIA</p>
            </div>
            <div className="up1-body">
              <p className="up1-error-desc">
                Identificamos que o endereço informado <strong>não está contemplado pela campanha de Entrega Grátis</strong>. Para que seu pedido seja enviado normalmente,
                é necessário o pagamento de uma taxa de entrega de <strong>R$ 8,90</strong>.
              </p>
              {(() => {
                const full = formatFullAddress(savedCheckout?.address);
                const city = savedCheckout?.address?.city || getCityFallback();
                return (
                  <div className="up1-address-box">
                    <div className="up1-address-label">Endereço de entrega</div>
                    <div className="up1-address-value">{full || `Endereço informado em ${city}`}</div>
                    <div className="up1-address-tag">Região fora da área de frete grátis</div>
                  </div>
                );
              })()}
              <div className="up1-error-info-box">
                <AlertTriangle size={16} strokeWidth={2} color="#c1172c" style={{ flexShrink: 0, marginTop: 2 }} />
                <p>
                  O pagamento da entrega é obrigatório para garantir o envio do pedido.{" "}
                  <span style={{ color: "#888" }}>(Caso não seja realizado, o pedido poderá ser cancelado automaticamente, sem direito a reembolso.)</span>
                </p>
              </div>
              <button className="up1-btn-primary" onClick={handlePagarFrete}>
                <span>PAGAR FRETE · R$ 8,90</span>
                <span className="up1-btn-arrow"><ArrowRight size={16} strokeWidth={2.5} /></span>
              </button>
              <div className="up1-cta-badge">
                <ShieldCheck size={13} strokeWidth={2} />
                <span>Clique no botão para continuar</span>
              </div>
            </div>
          </div>
        )}

        {stage === "pix" && pix && (
          <div className="up1-card up1-fade-in">
            <div className="up1-pix-banner">
              <div className="up1-banner-row">
                <div className="up1-pix-icon-wrap">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Pix_%28Brazil%29_logo.svg/1280px-Pix_%28Brazil%29_logo.svg.png"
                    alt="PIX"
                    style={{ width: 26, height: "auto", filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <div className="up1-banner-text">
                  <p className="up1-banner-title-sm">Pagamento via PIX</p>
                  <p className="up1-banner-subtitle">Escaneie o QR Code ou copie o código</p>
                </div>
              </div>
              <div className="up1-timer-badge">
                <div className="up1-timer-left">
                  <span className="up1-timer-dot" />
                  <span>Expira em</span>
                </div>
                <span className="up1-timer-val">{countdown}</span>
              </div>
            </div>
            <div className="up1-body">
              <div className="up1-value-pill">
                <span className="up1-value-label">Valor do frete</span>
                <span className="up1-value-amount">R$ {FRETE_VALUE.toFixed(2).replace(".", ",")}</span>
              </div>

              <div className="up1-pix-main">
                <div className="up1-qr-side">
                  <div className="up1-qr-box">
                    {qrDataUrl ? <img src={qrDataUrl} alt="QR Code PIX" style={{ width: 150, height: 150 }} /> : <div style={{ width: 150, height: 150, background: "#eef2f7", borderRadius: 8 }} />}
                    <span className="up1-qr-corner tl" />
                    <span className="up1-qr-corner tr" />
                    <span className="up1-qr-corner bl" />
                    <span className="up1-qr-corner br" />
                  </div>
                  <p className="up1-qr-hint">Escaneie com<br />o app do banco</p>
                </div>
                <div className="up1-code-side">
                  <span className="up1-code-label">Copia e Cola</span>
                  <div className="up1-pix-code-box">{pix.qr_code}</div>
                  <button className="up1-btn-copy" onClick={copy}>
                    {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} strokeWidth={2.5} />}
                    <span>{copied ? "COPIADO" : "COPIAR"}</span>
                  </button>
                </div>
              </div>

              <div className="up1-expiry-box">
                <Clock size={14} strokeWidth={2} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Código válido por <strong>30 minutos</strong>. Após expirar, será necessário gerar um novo.</span>
              </div>

              <p className="up1-section-label">Como pagar</p>
              <div className="up1-steps-list">
                {[
                  { n: 1, t: <>Abra o <strong>app do seu banco</strong></> },
                  { n: 2, t: <>Escolha <strong>PIX Copia e Cola</strong> ou <strong>QR Code</strong></> },
                  { n: 3, t: <>Cole o código ou escaneie e confirme</> },
                ].map((s) => (
                  <div className="up1-step-item" key={s.n}>
                    <div className="up1-step-num">{s.n}</div>
                    <p className="up1-step-text">{s.t}</p>
                  </div>
                ))}
              </div>

              <div className="up1-powered">
                <ShieldCheck size={12} strokeWidth={2} />
                Pagamento seguro via PIX • Banco Central do Brasil
              </div>
            </div>
          </div>
        )}

        {stage === "paid" && (
          <div className="up1-card up1-fade-in">
            <div className="up1-banner up1-banner-success">
              <div className="up1-check-circle">
                <Check size={36} strokeWidth={2.5} color="#fff" />
              </div>
              <p className="up1-banner-title">PAGAMENTO APROVADO</p>
            </div>
            <div className="up1-body" style={{ textAlign: "center", gap: 16, display: "flex", flexDirection: "column" }}>
              <p className="up1-error-desc" style={{ marginBottom: 0 }}>
                Recebemos seu pagamento! Seu pedido está sendo preparado e será enviado em instantes.
              </p>
              <div className="up1-cta-badge" style={{ background: "#ecfdf5", color: "#047857" }}>
                <ShieldCheck size={13} strokeWidth={2} />
                <span>Obrigado pela confiança!</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Overlays */}
      {stage === "loadingConfirm" && (
        <div className="up1-overlay">
          <div className="up1-loading-card">
            <div className="up1-loading-icon"><div className="up1-spinner-ring" /></div>
            <p className="up1-loading-title">Confirmando seus dados...</p>
            <p className="up1-loading-sub">Por favor aguarde</p>
            <div className="up1-progress-track">
              <div className="up1-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="up1-progress-label">{progress}%</span>
          </div>
        </div>
      )}

      {stage === "generating" && (
        <div className="up1-overlay">
          <div className="up1-loading-card">
            <div className="up1-loading-icon"><div className="up1-spinner-ring" /></div>
            <p className="up1-loading-title">Gerando seu PIX...</p>
            <p className="up1-loading-sub">Aguarde um momento</p>
            <div className="up1-gen-steps">
              {["Validando pedido", "Calculando frete", "Gerando chave PIX", "Criando QR Code"].map((label, i) => (
                <div key={label} className={`up1-gen-step ${genStep >= i + 1 ? "active" : ""}`}>
                  <div className="up1-gen-step-dot" />{label}
                </div>
              ))}
            </div>
            {status === "error" && error && (
              <p style={{ color: "#c1172c", fontSize: 12, marginTop: 8, textAlign: "center" }}>{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hidden helper to silence unused warning if needed by future use
void appendUtmsToUrl;

const UP1_CSS = `
.up1-root { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; color: #1a1a1a; }
.up1-header { background: #fff; border-bottom: 1px solid #e8eaf0; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: center; }
.up1-header img { height: 44px; width: auto; }
.up1-main { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px 60px; }
.up1-card { width: 100%; max-width: 520px; background: #fff; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.07), 0 12px 40px rgba(107,33,168,.08); overflow: hidden; }
.up1-fade-in { animation: up1Slide .4s cubic-bezier(.22,.68,0,1.2) both; }
@keyframes up1Slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.up1-banner { background: linear-gradient(135deg, #6b21a8, #7e22ce); padding: 32px 28px 28px; display: flex; flex-direction: column; align-items: center; gap: 16px; position: relative; overflow: hidden; }
.up1-banner::before { content: ''; position: absolute; width: 200px; height: 200px; border-radius: 50%; border: 20px solid rgba(255,255,255,.08); top: -60px; right: -60px; }
.up1-banner::after { content: ''; position: absolute; width: 120px; height: 120px; border-radius: 50%; border: 20px solid rgba(255,255,255,.08); bottom: -30px; left: -30px; }
.up1-banner-success { background: linear-gradient(135deg, #16a34a, #15803d); }
.up1-check-circle { width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,.15); border: 2.5px solid rgba(255,255,255,.4); display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; animation: up1Pop .5s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes up1Pop { 0% { transform: scale(.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
.up1-error-icon-wrap { width: 66px; height: 66px; border-radius: 50%; background: rgba(255,255,255,.15); border: 2px solid rgba(255,255,255,.4); display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; animation: up1Pop .5s both; }
.up1-banner-title { font-size: 17px; font-weight: 700; color: #fff; text-align: center; line-height: 1.4; position: relative; z-index: 1; letter-spacing: .3px; }

.up1-body { padding: 28px; display: flex; flex-direction: column; }
.up1-info-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #eef2f7; }
.up1-info-row:last-of-type { border-bottom: none; }
.up1-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b21a8; flex-shrink: 0; }
.up1-dot.gray { background: #b8c2cc; }
.up1-info-text { font-size: 14px; color: #555; line-height: 1.5; }
.up1-info-text strong { color: #1a1a1a; font-weight: 600; }
.up1-shimmer { animation: up1Shimmer 1.6s ease-in-out infinite; }
@keyframes up1Shimmer { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

.up1-btn-primary { display: flex; align-items: center; justify-content: space-between; width: 100%; background: #6b21a8; color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 1px; border: none; border-radius: 12px; padding: 17px 22px; cursor: pointer; text-transform: uppercase; transition: background .15s, transform .1s, box-shadow .2s; margin-top: 16px; box-shadow: 0 4px 14px rgba(107,33,168,.25); }
.up1-btn-primary:hover { background: #5b1894; box-shadow: 0 6px 20px rgba(107,33,168,.35); }
.up1-btn-primary:active { transform: scale(.99); }
.up1-btn-arrow { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; }

.up1-powered { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; font-size: 12px; color: #9aa4af; }

.up1-error-desc { font-size: 14px; color: #444; line-height: 1.6; margin-bottom: 16px; }
.up1-address-box { background: #faf5ff; border: 1px solid #e9d5ff; border-left: 4px solid #6b21a8; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
.up1-address-label { font-size: 11px; font-weight: 700; color: #6b21a8; letter-spacing: .6px; text-transform: uppercase; margin-bottom: 4px; }
.up1-address-value { font-size: 13.5px; color: #1a1a1a; font-weight: 600; line-height: 1.45; }
.up1-address-tag { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; color: #c1172c; background: #fff1f2; border: 1px solid #fecdd3; padding: 3px 8px; border-radius: 999px; letter-spacing: .3px; }
.up1-error-info-box { display: flex; gap: 10px; align-items: flex-start; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 10px; padding: 14px; font-size: 13.5px; color: #1a1a1a; line-height: 1.55; margin-bottom: 4px; }
.up1-cta-badge { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 14px; font-size: 12px; color: #6b7280; background: #f7f9fc; border-radius: 99px; padding: 8px 16px; width: fit-content; align-self: center; }

.up1-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(3px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.up1-loading-card { background: #fff; border-radius: 20px; padding: 36px 40px; display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%; max-width: 340px; box-shadow: 0 8px 40px rgba(0,0,0,.18); animation: up1Slide .3s both; }
.up1-loading-icon { width: 60px; height: 60px; border-radius: 50%; background: #f3eaff; display: flex; align-items: center; justify-content: center; }
.up1-spinner-ring { width: 32px; height: 32px; border: 3px solid #d8c4f0; border-top-color: #6b21a8; border-radius: 50%; animation: up1Spin .8s linear infinite; }
@keyframes up1Spin { to { transform: rotate(360deg); } }
.up1-loading-title { font-size: 16px; font-weight: 700; color: #1a1a1a; text-align: center; }
.up1-loading-sub { font-size: 13px; color: #888; margin-top: -8px; text-align: center; }
.up1-progress-track { width: 100%; height: 6px; background: #eef2f7; border-radius: 99px; overflow: hidden; }
.up1-progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #6b21a8, #a855f7); border-radius: 99px; transition: width .4s ease; }
.up1-progress-label { font-size: 12px; color: #9aa4af; align-self: flex-end; margin-top: -10px; }

.up1-gen-steps { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 6px; }
.up1-gen-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #b8c2cc; transition: color .25s; }
.up1-gen-step.active { color: #1a1a1a; font-weight: 600; }
.up1-gen-step-dot { width: 8px; height: 8px; border-radius: 50%; background: #d9e2f2; transition: background .25s, box-shadow .25s; }
.up1-gen-step.active .up1-gen-step-dot { background: #16a34a; box-shadow: 0 0 0 4px rgba(22,163,74,.15); }

.up1-pix-banner { background: linear-gradient(135deg, #6b21a8, #7e22ce); padding: 24px 28px 22px; display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; }
.up1-pix-banner::before { content: ''; position: absolute; width: 200px; height: 200px; border-radius: 50%; border: 20px solid rgba(255,255,255,.08); top: -60px; right: -60px; }
.up1-banner-row { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
.up1-pix-icon-wrap { width: 48px; height: 48px; min-width: 48px; border-radius: 12px; background: rgba(255,255,255,.18); border: 1.5px solid rgba(255,255,255,.4); display: flex; align-items: center; justify-content: center; animation: up1Pop .4s both; }
.up1-banner-text { display: flex; flex-direction: column; gap: 2px; }
.up1-banner-title-sm { font-size: 16px; font-weight: 700; color: #fff; line-height: 1.2; }
.up1-banner-subtitle { font-size: 12px; color: rgba(255,255,255,.75); }
.up1-timer-badge { display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,.18); border: 1px solid rgba(255,255,255,.2); border-radius: 8px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #fff; position: relative; z-index: 1; }
.up1-timer-left { display: flex; align-items: center; gap: 7px; }
.up1-timer-dot { width: 7px; height: 7px; border-radius: 50%; background: #ffcc00; box-shadow: 0 0 6px #ffcc00; animation: up1Pulse 1s ease-in-out infinite; }
@keyframes up1Pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.7); } }
.up1-timer-val { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 1px; }

.up1-value-pill { display: flex; align-items: center; justify-content: space-between; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
.up1-value-label { font-size: 13px; color: #555; }
.up1-value-amount { font-size: 18px; font-weight: 700; color: #6b21a8; }

.up1-pix-main { display: flex; gap: 16px; flex-direction: column; }
.up1-qr-side { display: flex; flex-direction: column; align-items: center; gap: 8px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px; }
.up1-qr-box { position: relative; width: 150px; height: 150px; }
.up1-qr-corner { position: absolute; width: 16px; height: 16px; border-color: #6b21a8; border-style: solid; border-width: 0; }
.up1-qr-corner.tl { top: -3px; left: -3px; border-top-width: 3px; border-left-width: 3px; border-radius: 4px 0 0 0; }
.up1-qr-corner.tr { top: -3px; right: -3px; border-top-width: 3px; border-right-width: 3px; border-radius: 0 4px 0 0; }
.up1-qr-corner.bl { bottom: -3px; left: -3px; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 4px; }
.up1-qr-corner.br { bottom: -3px; right: -3px; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }
.up1-qr-hint { font-size: 11px; color: #999; text-align: center; line-height: 1.4; }

.up1-code-side { display: flex; flex-direction: column; gap: 8px; }
.up1-code-label { font-size: 11px; font-weight: 700; letter-spacing: .7px; color: #7b8794; text-transform: uppercase; }
.up1-pix-code-box { background: #f4f7fb; border: 1px solid #d9e2f2; border-radius: 10px; padding: 12px; font-size: 10.5px; color: #555; font-family: 'Courier New', monospace; word-break: break-all; line-height: 1.6; user-select: all; min-height: 80px; max-height: 120px; overflow-y: auto; }
.up1-btn-copy { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #16a34a; color: #fff; font-size: 13px; font-weight: 700; letter-spacing: .6px; border: none; border-radius: 10px; padding: 14px; cursor: pointer; text-transform: uppercase; transition: background .15s, transform .1s; }
.up1-btn-copy:hover { background: #15803d; }
.up1-btn-copy:active { transform: scale(.99); }

.up1-expiry-box { display: flex; gap: 8px; align-items: flex-start; background: #fffbe6; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: #78350f; line-height: 1.5; margin-top: 16px; }

.up1-section-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .7px; margin: 20px 0 12px; }
.up1-steps-list { display: flex; flex-direction: column; gap: 10px; }
.up1-step-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: #f9fafb; border-radius: 10px; }
.up1-step-num { width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: #6b21a8; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.up1-step-text { font-size: 13px; color: #444; line-height: 1.4; }

@media (min-width: 520px) {
  .up1-pix-main { flex-direction: row; align-items: stretch; }
  .up1-qr-side { flex: 0 0 auto; }
  .up1-code-side { flex: 1; }
}
`;
