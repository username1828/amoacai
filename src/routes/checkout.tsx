import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Trash2, ShieldCheck, Minus, Plus, ArrowLeft } from "lucide-react";
import { CheckoutModal, type CheckoutData } from "@/components/CheckoutModal";
import { PixModal } from "@/components/PixModal";
import { loadCart, saveCart, clearCart, type StoredCartItem } from "@/lib/cartStorage";
import { captureUtmsFromLocation, readUtms } from "@/lib/utm";
import { formatBRL } from "@/lib/products";
import { track } from "@/lib/tracking";
import { ASSETS } from "@/lib/assets";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout - AmoAçaí" },
      { name: "description", content: "Finalize seu pedido AmoAçaí com pagamento seguro via PIX." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

  useEffect(() => {
    captureUtmsFromLocation();
    const { items, notes } = loadCart();
    setItems(items);
    setGeneralNotes(notes);
    setLoaded(true);
    window.scrollTo({ top: 0 });
    track("checkout_started", { items: items.length, totalQty: items.reduce((s, i) => s + i.qty, 0) });
  }, []);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (i.product.price + i.extras) * i.qty, 0),
    [items],
  );
  const oldSubtotal = useMemo(
    () => items.reduce((s, i) => s + ((i.product.oldPrice ?? i.product.price) + i.extras) * i.qty, 0),
    [items],
  );
  const savings = Math.max(0, oldSubtotal - subtotal);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const setQty = (uid: string, qty: number) => {
    setItems((c) => {
      const next = qty <= 0 ? c.filter((i) => i.uid !== uid) : c.map((i) => (i.uid === uid ? { ...i, qty } : i));
      saveCart(next, generalNotes);
      return next;
    });
  };

  const goHome = () => {
    navigate({ to: "/", search: (prev: Record<string, unknown>) => prev ?? {} });
  };

  const lines = items.map((i) => ({
    name: i.product.name,
    qty: i.qty,
    price: i.product.price + i.extras,
    oldPrice: i.product.oldPrice ? i.product.oldPrice + i.extras : undefined,
    notes: i.notes,
    selections: Object.values(i.selections).flat(),
  }));

  if (loaded && items.length === 0 && !pixOpen) {
    return (
      <div className="min-h-screen bg-secondary/30 flex flex-col">
        <TopBar onBack={goHome} />
        <main className="flex-1 grid place-items-center px-4 py-12">
          <div className="text-center max-w-sm">
            <ShoppingBag size={64} strokeWidth={1.5} className="mx-auto mb-4 text-muted-foreground/60" />
            <h1 className="text-xl font-extrabold">Sua sacola está vazia</h1>
            <p className="text-sm text-muted-foreground mt-2">Volte para o cardápio e adicione produtos deliciosos para finalizar seu pedido.</p>
            <button
              onClick={goHome}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition"
            >
              Voltar ao cardápio
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-10">
      <TopBar onBack={goHome} />

      <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left: Form + items */}
        <div className="space-y-5 order-2 lg:order-1">
          {/* Items recap */}
          <section className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
            <header className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">Seu pedido</h2>
                <p className="text-[11px] text-muted-foreground">{totalQty} {totalQty === 1 ? "item" : "itens"} · revise antes de pagar</p>
              </div>
              <button onClick={goHome} className="text-xs font-bold text-primary hover:underline">+ Adicionar mais</button>
            </header>
            <ul className="divide-y divide-border">
              {items.map((i) => {
                const sel = Object.values(i.selections).flat();
                return (
                  <li key={i.uid} className="px-5 py-3 flex gap-3 items-start">
                    <img src={i.product.image} alt={i.product.name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2">{i.product.name}</h3>
                      {sel.length > 0 && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{sel.join(" · ")}</p>}
                      {i.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1">Obs: {i.notes}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          {i.product.oldPrice && (
                            <span className="text-[11px] text-muted-foreground line-through leading-none">
                              {formatBRL((i.product.oldPrice + i.extras) * i.qty)}
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-primary leading-tight">
                            {formatBRL((i.product.price + i.extras) * i.qty)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1">
                          <button
                            onClick={() => setQty(i.uid, i.qty - 1)}
                            aria-label="Diminuir"
                            className="h-7 w-7 grid place-items-center text-primary text-lg font-bold active:scale-90 transition"
                          >
                            {i.qty === 1 ? <Trash2 size={14} /> : <Minus size={16} strokeWidth={2.5} />}
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{i.qty}</span>
                          <button
                            onClick={() => setQty(i.uid, i.qty + 1)}
                            aria-label="Aumentar"
                            className="h-7 w-7 grid place-items-center text-primary text-lg font-bold active:scale-90 transition"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Customer + delivery + address + summary (embedded stepped flow) */}
          <CheckoutModal
            embedded
            onClose={goHome}
            items={lines}
            subtotal={subtotal}
            generalNotes={generalNotes}
            onComplete={(data) => {
              setCheckoutData(data);
              setPixOpen(true);
            }}
          />

        </div>

        {/* Right: Sticky summary (desktop) */}
        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24 space-y-3">
            <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-extrabold">Resumo</h2>
                <p className="text-[11px] text-muted-foreground">Valores podem variar conforme entrega</p>
              </div>
              <div className="p-5 space-y-2">
                {savings > 0 && (
                  <Row label="De" value={formatBRL(oldSubtotal)} muted strike />
                )}
                <Row label="Subtotal" value={formatBRL(subtotal)} />
                {savings > 0 && (
                  <Row label="Você economiza" value={`- ${formatBRL(savings)}`} accent />
                )}
                <Row label="Entrega" value="Definida ao lado" muted />
                <div className="pt-3 border-t border-dashed border-border flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-extrabold text-primary">{formatBRL(subtotal)}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center px-3">
              Ao concluir você concorda com os termos da loja. Pagamento processado via PIX.
            </p>
          </div>
        </aside>
      </main>

      {pixOpen && (
        <PixModal
          amount={subtotal + (checkoutData?.shipping_fee ?? 0)}
          onClose={() => {
            setPixOpen(false);
            clearCart();
            goHome();
          }}
          extras={checkoutData ? {
            customer: {
              name: checkoutData.customer.name,
              phone: checkoutData.customer.phone.replace(/\D/g, ""),
              cpf: checkoutData.customer.cpf.replace(/\D/g, ""),
            },
            address: checkoutData.address,
            delivery_type: checkoutData.delivery_type,
            scheduled: checkoutData.scheduled,
            delivery_time: checkoutData.delivery_time,
            utm: readUtms(),
          } : undefined}
        />
      )}
    </div>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-secondary text-sm font-semibold"
          aria-label="Voltar"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <img src={ASSETS.logo} alt="AmoAçaí" className="h-9 w-9 rounded-full object-contain bg-white border border-border" />
          <span className="font-extrabold text-sm hidden sm:inline">Finalizar pedido</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">
          <ShieldCheck size={14} /> Seguro
        </div>
      </div>
    </header>
  );
}

function Row({ label, value, accent, muted, strike }: { label: string; value: string; accent?: boolean; muted?: boolean; strike?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${accent ? "text-accent font-extrabold" : "font-semibold"} ${strike ? "line-through text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}