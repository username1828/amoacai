import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Search, ShoppingBag, ShoppingCart, Trash2, Sparkles, Heart, Star, Check, X, Minus, Plus } from "lucide-react";
import { CATEGORIES, PRODUCTS, REVIEWS, formatBRL, type Product } from "@/lib/products";
import { GeoPopup } from "@/components/GeoPopup";
import { PurchaseToast } from "@/components/PurchaseToast";
import { ProductModal, type ChosenOptions } from "@/components/ProductModal";
const heroBanner = { url: "/uploads/hero-banner.jpg" };
const logoAsset = { url: "/uploads/logo.png" };
import { captureUtmsFromLocation } from "@/lib/utm";
import { saveCart } from "@/lib/cartStorage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AmoAçaí - Delivery" },
      { name: "description", content: "AmoAçaí – Açaíteria. Peça seu açaí fresquinho com entrega rápida. Combos, barcas, garrafas e muito mais!" },
      { property: "og:title", content: "AmoAçaí - Delivery" },
      { property: "og:description", content: "Peça seu açaí fresquinho com entrega rápida." },
      { property: "og:image", content: heroBanner.url },
    ],
  }),
  component: Index,
});

type CartItem = {
  uid: string;
  product: Product;
  qty: number;
  extras: number;
  selections: Record<string, string[]>;
  notes: string;
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function Index() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<string>("");
  const onLocResolved = useCallback((label: string) => setUserLoc(label), []);
  const productRefs = useRef<Record<string, HTMLElement | null>>({});
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { captureUtmsFromLocation(); }, []);

  const q = norm(query);
  const searchResults = useMemo(() => {
    if (!q) return [] as Product[];
    const seen = new Set<number>();
    const out: Product[] = [];
    for (const p of PRODUCTS) {
      if (norm(p.name).includes(q) && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    CATEGORIES.forEach((c) => map.set(c, []));
    PRODUCTS.forEach((p) => map.get(p.category)?.push(p));
    return map;
  }, []);

  const subtotal = cart.reduce((s, i) => s + (i.product.price + i.extras) * i.qty, 0);
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const oldSubtotal = cart.reduce(
    (s, i) => s + ((i.product.oldPrice ?? i.product.price) + i.extras) * i.qty,
    0,
  );
  const savings = Math.max(0, oldSubtotal - subtotal);

  // Order bumps: 4 cheaper/popular products not yet in cart
  const orderBumps = useMemo(() => {
    const inCart = new Set(cart.map((i) => i.product.id));
    const candidatesIds = [4, 14, 15, 16, 17, 5, 8, 10];
    const out: Product[] = [];
    for (const id of candidatesIds) {
      const p = PRODUCTS.find((x) => x.id === id);
      if (p && !inCart.has(p.id)) out.push(p);
      if (out.length >= 4) break;
    }
    if (out.length < 4) {
      for (const p of PRODUCTS) {
        if (!inCart.has(p.id) && !out.find((o) => o.id === p.id)) out.push(p);
        if (out.length >= 4) break;
      }
    }
    return out;
  }, [cart]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocus(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const jumpToProduct = (p: Product) => {
    setSearchFocus(false);
    setQuery("");
    setModalProduct(p);
  };

  const addToCart = (p: Product, chosen: ChosenOptions) => {
    setCart((c) => [
      ...c,
      {
        uid: `${p.id}-${Date.now()}`,
        product: p,
        qty: chosen.qty,
        extras: chosen.extras,
        selections: chosen.selections,
        notes: chosen.notes,
      },
    ]);
    setModalProduct(null);
    setToast(`${p.name} adicionado ao carrinho`);
    setTimeout(() => setToast(null), 2500);
  };
  const setQty = (uid: string, qty: number) =>
    setCart((c) =>
      qty <= 0 ? c.filter((i) => i.uid !== uid) : c.map((i) => (i.uid === uid ? { ...i, qty } : i)),
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero banner full-bleed with floating OPEN pill */}
      <section className="relative">
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-extrabold text-accent-foreground shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> ABERTO AGORA
        </div>
        <img
          src={heroBanner.url}
          alt="AmoAçaí - Feito com amor"
          className="w-full h-44 sm:h-56 md:h-72 object-cover object-center"
        />
      </section>

      {/* Brand card */}
      <section className="relative -mt-10 mx-auto max-w-2xl px-4 text-center">
        <div className="mx-auto h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-white border-4 border-background shadow-lg grid place-items-center overflow-hidden">
          <img src={logoAsset.url} alt="AmoAçaí" className="h-full w-full object-contain p-1" />
        </div>
        <h1 className="mt-3 text-xl font-extrabold flex items-center justify-center gap-1.5">
          AmoAçaí
          <span className="inline-flex h-5 w-5 rounded-full bg-[#3b82f6] text-white items-center justify-center" aria-label="Verificado">
            <Check size={12} strokeWidth={3} />
          </span>
        </h1>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            Entrega rápida · 25 a 40 min
          </span>
          {userLoc && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              <MapPin size={13} className="text-primary" strokeWidth={2.5} /> {userLoc}
            </span>
          )}
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-2xl px-4 mt-5 relative" ref={searchBoxRef}>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            placeholder="Buscar açaís, barcas, roletas..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); }}
              aria-label="Limpar"
              className="h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchFocus && query.trim() && (
          <div className="absolute left-4 right-4 mt-2 z-40 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">Nenhum produto encontrado.</div>
                  <div className="mt-1 text-xs">Tente pesquisar por outro nome.</div>
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => jumpToProduct(p)}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary text-left border-b border-border last:border-0"
                  >
                    <img src={p.image} alt="" className="h-11 w-11 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.category}</div>
                    </div>
                    <div className="text-sm font-extrabold text-primary shrink-0">{formatBRL(p.price)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* Categories: 2-column responsive grid */}
      <main className="mx-auto max-w-2xl px-4 py-5 space-y-8 pb-32">
        {CATEGORIES.map((cat) => {
          const items = grouped.get(cat) || [];
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-lg font-extrabold mb-3 pb-2 border-b border-border">{cat}</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {items.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    ref={(el) => { productRefs.current[p.id] = el; }}
                    onClick={() => setModalProduct(p)}
                    className="text-left flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="text-[13px] sm:text-sm font-semibold leading-snug line-clamp-2 min-h-[2.4rem]">{p.name}</h3>
                      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          {p.oldPrice && (
                            <div className="text-[11px] text-muted-foreground line-through leading-tight">
                              {formatBRL(p.oldPrice)}
                            </div>
                          )}
                          <div className="text-[15px] font-extrabold text-primary leading-tight">{formatBRL(p.price)}</div>
                        </div>
                        <span
                          aria-hidden
                          className="h-9 w-9 grid place-items-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-md transition shrink-0"
                        >
                          +
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        {/* Reviews */}
        <section>
          <div className="flex items-center gap-3 mb-4 pt-2">
            <div className="text-3xl font-extrabold text-primary">4,9</div>
            <div>
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">312 avaliações · Excelente</div>
            </div>
          </div>
          <div className="grid gap-3">
            {REVIEWS.map((r) => (
              <div key={r.ini} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
                    {r.ini}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.time}</div>
                  </div>
                  <div className="flex gap-0.5 text-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground/80">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          © {new Date().getFullYear()} AmoAçaí · Feito com
          <Heart size={12} className="text-primary" fill="currentColor" strokeWidth={0} />
        </span>
      </footer>

      {/* Fixed bottom cart bar (iFood style) */}
      {totalQty > 0 && !cartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto mx-auto w-full max-w-xl flex items-center justify-between gap-3 rounded-2xl bg-accent text-accent-foreground px-4 py-3 min-h-16 shadow-2xl active:scale-[0.99] transition animate-in slide-in-from-bottom-4"
          >
            <div className="relative">
              <ShoppingCart size={24} strokeWidth={2.25} />
              <span className="absolute -top-1 -right-2 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold grid place-items-center border-2 border-accent">
                {totalQty}
              </span>
            </div>
            <span className="font-bold text-base">Ver carrinho</span>
            <span className="font-extrabold text-base">{formatBRL(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-background shadow-2xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div>
                <h2 className="text-base font-extrabold leading-tight">Sacola</h2>
                <p className="text-[11px] text-muted-foreground">AmoAçaí · Entrega 25–40 min</p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Fechar"
                className="h-9 w-9 rounded-full hover:bg-secondary grid place-items-center text-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto bg-secondary/30">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground px-6">
                  <ShoppingBag size={64} strokeWidth={1.5} className="mx-auto mb-3 text-muted-foreground/60" />
                  <div className="font-semibold text-foreground">Sua sacola está vazia</div>
                  <div className="text-sm mt-1">Adicione produtos deliciosos para começar</div>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div className="bg-background">
                    <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Itens da sacola
                    </div>
                    <ul className="divide-y divide-border">
                      {cart.map((i) => {
                        const sel = Object.values(i.selections).flat();
                        return (
                          <li key={i.uid} className="px-4 py-3 flex gap-3">
                            <img src={i.product.image} alt={i.product.name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold leading-snug line-clamp-2">{i.product.name}</h4>
                              </div>
                              {sel.length > 0 && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                  {sel.join(" · ")}
                                </p>
                              )}
                              {i.notes && (
                                <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-1">
                                  Obs: {i.notes}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
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
                                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1">
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
                  </div>

                  {/* Order bumps */}
                  {orderBumps.length > 0 && (
                    <div className="mt-3 bg-background">
                      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                        <Sparkles size={16} className="text-accent" />
                        <div>
                          <div className="text-sm font-extrabold leading-tight">Aproveite e leve também</div>
                          <div className="text-[11px] text-muted-foreground">Adicione com 1 clique antes de finalizar</div>
                        </div>
                      </div>
                      <ul className="divide-y divide-border">
                        {orderBumps.map((p) => (
                          <li key={`bump-${p.id}`} className="px-4 py-3 flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="h-14 w-14 rounded-xl object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                {p.oldPrice && (
                                  <span className="text-[11px] text-muted-foreground line-through">{formatBRL(p.oldPrice)}</span>
                                )}
                                <span className="text-sm font-extrabold text-primary">{formatBRL(p.price)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => addToCart(p, { qty: 1, extras: 0, selections: {}, notes: "" })}
                              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold shadow active:scale-95 transition"
                            >
                              + Adicionar
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-3 bg-background px-4 py-3">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Observações gerais
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Ex: caprichar no morango, sem granola..."
                      className="mt-1 w-full rounded-xl border border-border bg-card p-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Clear */}
                  <div className="px-4 py-3 text-center">
                    <button
                      onClick={() => setCart([])}
                      className="text-xs font-semibold text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
                    >
                      Esvaziar sacola
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-background p-4 space-y-3">
              <div className="space-y-1">
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">De</span>
                    <span className="font-medium text-muted-foreground line-through">{formatBRL(oldSubtotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatBRL(subtotal)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-accent font-semibold">Você economiza</span>
                    <span className="font-extrabold text-accent">{formatBRL(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="font-bold text-accent">Definida na próxima etapa</span>
                </div>
                <div className="flex justify-between text-base font-extrabold pt-1 border-t border-dashed border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(subtotal)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (subtotal <= 0) return;
                  saveCart(cart, notes);
                  setCartOpen(false);
                  // Preserve UTMs and any current query params on navigation
                  const search = typeof window !== "undefined" ? window.location.search : "";
                  window.location.href = `/checkout${search}`;
                }}
                disabled={cart.length === 0}
                className="w-full rounded-2xl bg-accent text-accent-foreground py-3.5 text-sm font-extrabold shadow-lg disabled:opacity-50 hover:opacity-95 active:scale-[0.99] transition flex items-center justify-between px-5"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-6 min-w-6 px-1.5 rounded-full bg-white/20 text-[11px] grid place-items-center">{totalQty}</span>
                  Continuar
                </span>
                <span>{formatBRL(subtotal)}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-foreground text-background px-5 py-3 text-sm shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}

      <GeoPopup onResolved={onLocResolved} />
      <PurchaseToast city={userLoc} onOpenProduct={(p) => setModalProduct(p)} />
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}
