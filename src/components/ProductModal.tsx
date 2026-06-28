import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, ChevronLeft, X } from "lucide-react";
import { formatBRL, type Product } from "@/lib/products";
import { getGroupsForCategory } from "@/lib/productOptions";

export type ChosenOptions = {
  selections: Record<string, string[]>;
  extras: number;
  notes: string;
  qty: number;
};

export function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product, chosen: ChosenOptions) => void;
}) {
  const groups = useMemo(() => getGroupsForCategory(product.category), [product.category]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const toggle = (groupTitle: string, name: string, max: number) => {
    setSelections((s) => {
      const cur = s[groupTitle] || [];
      if (cur.includes(name)) return { ...s, [groupTitle]: cur.filter((n) => n !== name) };
      if (cur.length >= max) {
        setWarning(`Limite atingido em "${groupTitle}" — máximo ${max} ${max === 1 ? "item" : "itens"}.`);
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

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="relative shrink-0">
          <div className="w-full aspect-[3/2] bg-secondary overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="absolute top-3 left-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"
          ><ChevronLeft size={20} strokeWidth={2.25} /></button>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"
          ><X size={18} strokeWidth={2.25} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-5 pt-4">
            <h2 className="text-[17px] font-extrabold">{product.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {product.category}
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-[22px] font-extrabold text-primary">{formatBRL(product.price)}</span>
              {product.oldPrice && (
                <span className="text-[13px] text-muted-foreground line-through">{formatBRL(product.oldPrice)}</span>
              )}
            </div>
          </div>

          <div className="mt-3">
            {groups.map((g) => {
              const picked = selections[g.title] || [];
              const atMax = picked.length >= g.max;
              return (
                <div key={g.title} className="border-t border-border mt-3">
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
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4">
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
        </div>

        <div className="relative shrink-0 border-t border-border p-3 flex items-center gap-2 bg-background">
          {warning && (
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-14 bg-destructive text-destructive-foreground text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg">
              {warning}
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-9 w-9 grid place-items-center rounded-full border border-border text-lg hover:bg-secondary"
              aria-label="Diminuir"
            >−</button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-9 w-9 grid place-items-center rounded-full border border-border text-lg hover:bg-secondary"
              aria-label="Aumentar"
            >+</button>
          </div>
          <button
            onClick={() => onAdd(product, { selections, extras, notes, qty })}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground h-10 px-3 text-[13px] font-bold hover:opacity-90 active:scale-[0.98] transition shadow-md"
          >
            <ShoppingCart size={14} strokeWidth={2.5} />
            <span>Adicionar · {formatBRL(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}