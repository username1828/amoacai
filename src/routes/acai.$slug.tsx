import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShoppingCart, Check, Star, Bike, Clock } from "lucide-react";
import { PRODUCTS, formatBRL } from "@/lib/products";
import { getGroupsForCategory } from "@/lib/productOptions";
import { loadCart, saveCart, type StoredCartItem } from "@/lib/cartStorage";
import { captureUtmsFromLocation } from "@/lib/utm";
import { track } from "@/lib/tracking";
import { ASSETS } from "@/lib/assets";

export const Route = createFileRoute("/acai/$slug")({
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.name} — AmoAçaí` : "Produto — AmoAçaí";
    const desc = p
      ? `${p.name} por ${p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Peça com entrega rápida.`
      : "Produto AmoAçaí com entrega rápida.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(p ? [{ property: "og:image", content: p.image }, { name: "twitter:image", content: p.image }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">Produto não encontrado</h1>
        <p className="text-sm text-muted-foreground mt-2">Esse açaí não está mais disponível.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-bold">Voltar ao cardápio</Link>
      </div>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const navigate = useNavigate();
  const groups = useMemo(() => getGroupsForCategory(product.category), [product.category]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    captureUtmsFromLocation();
    track("product_view", { id: product.id, name: product.name, price: product.price });
    window.scrollTo({ top: 0 });
  }, [product.id]);

  const toggle = (groupTitle: string, name: string, max: number) => {
    setSelections((s) => {
      const cur = s[groupTitle] || [];
      if (cur.includes(name)) return { ...s, [groupTitle]: cur.filter((n) => n !== name) };
      if (cur.length >= max) {
        setWarning(`Limite atingido em "${groupTitle}" — máximo ${max}.`);
        setTimeout(() => setWarning(null), 2200);
        return s;
      }
      return { ...s, [groupTitle]: [...cur, name] };
    });
  };

  const extras = useMemo(() => {
    let total = 0;
    for (const g of groups) {
      const picked = selections[g.title] || [];
      for (const item of g.items) {
        if (item.price && picked.includes(item.name)) total += item.price;
      }
    }
    return total;
  }, [groups, selections]);

  const unit = product.price + extras;
  const total = unit * qty;

  const addAndGoCheckout = () => {
    const { items, notes: storedNotes } = loadCart();
    const item: StoredCartItem = {
      uid: `${product.id}-${Date.now()}`,
      product,
      qty,
      extras,
      selections,
      notes,
    };
    const next = [...items, item];
    saveCart(next, storedNotes);
    track("add_to_cart", { id: product.id, name: product.name, qty, price: unit, total });
    navigate({ to: "/checkout", search: (s: Record<string, unknown>) => s ?? {} });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/", search: (s: Record<string, unknown>) => s ?? {} })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-secondary text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <img src={ASSETS.logo} alt="AmoAçaí" className="h-9 w-9 rounded-full object-contain bg-white border border-border" />
          <Link
            to="/checkout"
            className="text-xs font-bold text-primary hover:underline"
          >Sacola</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        <div className="w-full aspect-[4/3] bg-secondary overflow-hidden">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="px-5 pt-5">
          <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {product.category}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight">{product.name}</h1>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary">{formatBRL(product.price)}</span>
            {product.oldPrice && (
              <span className="text-sm text-muted-foreground line-through">{formatBRL(product.oldPrice)}</span>
            )}
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="ml-1 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold px-2 py-0.5">
                -{Math.round((1 - product.price / product.oldPrice) * 100)}%
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star size={14} className="text-accent" fill="currentColor" strokeWidth={0} /> 4,9</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} /> 25–40 min</span>
            <span className="inline-flex items-center gap-1"><Bike size={13} /> Entrega rápida</span>
          </div>
        </div>

        <div className="mt-4">
          {groups.map((g) => {
            const picked = selections[g.title] || [];
            const atMax = picked.length >= g.max;
            return (
              <div key={g.title} className="border-t border-border mt-2">
                <div className="flex items-center justify-between px-5 py-3 bg-secondary/50">
                  <div className="text-[13px] font-extrabold">
                    {g.title}
                    <span className="ml-2 text-[10px] font-medium text-muted-foreground">
                      {picked.length}/{g.max}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${atMax ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {atMax ? "limite atingido" : `até ${g.max}`}
                  </span>
                </div>
                <div>
                  {g.items.map((it) => {
                    const checked = picked.includes(it.name);
                    const disabled = !checked && picked.length >= g.max;
                    return (
                      <label
                        key={it.name}
                        className={`flex items-center justify-between px-5 py-2.5 border-b border-border/60 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}
                      >
                        <span>{it.name}</span>
                        <div className="flex items-center gap-2">
                          {it.price ? (
                            <span className="text-[11px] font-bold text-primary">+ {formatBRL(it.price)}</span>
                          ) : (
                            <span className="text-[11px] font-medium text-accent">Grátis</span>
                          )}
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(g.title, it.name, g.max)}
                            className="h-4 w-4 accent-primary"
                          />
                          {checked && <Check size={14} className="text-accent" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-5">
          <div className="text-xs font-bold mb-1">
            Observações <span className="font-normal text-muted-foreground">(opcional)</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Ex: sem banana, mais granola..."
            className="w-full rounded-xl border border-border bg-card p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="px-5">
          <Badge icon={<Star size={18} />} label="Avaliação 4,9" />
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border p-3">
        {warning && (
          <div className="mx-auto max-w-2xl mb-2 bg-destructive text-destructive-foreground text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg text-center">
            {warning}
          </div>
        )}
        <div className="mx-auto max-w-2xl flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-10 w-10 grid place-items-center rounded-full border border-border text-lg hover:bg-secondary"
              aria-label="Diminuir"
            >−</button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-10 w-10 grid place-items-center rounded-full border border-border text-lg hover:bg-secondary"
              aria-label="Aumentar"
            >+</button>
          </div>
          <button
            onClick={addAndGoCheckout}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground h-12 px-4 text-sm font-bold hover:opacity-90 active:scale-[0.98] transition shadow-md"
          >
            <ShoppingCart size={16} strokeWidth={2.5} />
            <span>Adicionar · {formatBRL(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="group rounded-2xl bg-secondary/40 border border-transparent p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-card hover:border-border hover:shadow-md">
      <div className="mx-auto h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{icon}</div>
      <div className="mt-2 text-[10px] font-extrabold leading-tight">{label}</div>
    </div>
  );
}