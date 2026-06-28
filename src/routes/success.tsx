import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Check, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import logoAsset from "@/assets/logo.webp.asset.json";
import { appendUtmsToUrl, captureUtmsFromLocation } from "@/lib/utm";
import { track } from "@/lib/tracking";

const UPSELL_URL = "https://amoacai.vercel.app/up1/";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [
      { title: "Pagamento aprovado — AmoAçaí" },
      { name: "description", content: "Seu pagamento PIX foi aprovado. Em instantes seu pedido será preparado." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    captureUtmsFromLocation();
    track("payment_approved", { page: "success" });
    try { localStorage.removeItem("amoacai_cart_v1"); } catch { /* ignore */ }
    try { localStorage.removeItem("amoacai_cart_notes_v1"); } catch { /* ignore */ }
  }, []);

  const goUpsell = () => {
    window.location.href = appendUtmsToUrl(UPSELL_URL);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background flex flex-col">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0">
        <div className="mx-auto max-w-2xl px-4 h-16 flex items-center justify-center gap-2">
          <img src={logoAsset.url} alt="AmoAçaí" className="h-9 w-9 rounded-full object-contain bg-white border border-border" />
          <span className="font-extrabold text-sm">AmoAçaí</span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-10">
        <div className="rounded-3xl bg-card border border-border shadow-sm p-8 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-accent grid place-items-center text-accent-foreground shadow-lg animate-in zoom-in">
            <Check size={44} strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">Pagamento aprovado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recebemos sua confirmação PIX. Seu pedido já está sendo preparado com carinho.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-secondary/40 border border-border p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</div>
              <div className="mt-1 text-sm font-extrabold text-accent">Confirmado</div>
            </div>
            <div className="rounded-2xl bg-secondary/40 border border-border p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Entrega</div>
              <div className="mt-1 text-sm font-extrabold">25 a 40 min</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-primary/5 border border-primary/20 p-5 text-left">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <span className="text-sm font-extrabold">Oferta exclusiva para você</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aproveite e adicione um upgrade ao seu pedido com desconto. Só agora!
            </p>
            <button
              onClick={goUpsell}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 px-4 text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Ver oferta especial <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={() => navigate({ to: "/", search: (s: Record<string, unknown>) => s ?? {} })}
            className="mt-3 w-full inline-flex items-center justify-center rounded-full border border-border bg-background py-3 px-4 text-sm font-semibold hover:bg-secondary transition"
          >
            Voltar ao cardápio
          </button>

          <div className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck size={14} className="text-accent" /> Pagamento confirmado com segurança
          </div>
        </div>
      </main>
    </div>
  );
}