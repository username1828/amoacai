import { useEffect, useState } from "react";
import { MapPin, X, ArrowRight } from "lucide-react";
import { PRODUCTS, type Product } from "@/lib/products";

const NAMES = [
  "Fernanda Lima", "Lucas Oliveira", "Mariana Costa", "Pedro Henrique",
  "Ana Beatriz", "Rafael Souza", "Juliana Alves", "Bruno Martins",
  "Camila Rocha", "Thiago Mendes", "Larissa Pereira", "Gustavo Almeida",
  "Patrícia Nunes", "Rodrigo Barbosa", "Beatriz Carvalho", "Eduardo Pinto",
  "Sabrina Cardoso", "Vinícius Ramos", "Carolina Dias", "Marcelo Teixeira",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type Toast = { id: number; name: string; product: Product; city: string; qty: number };

export function PurchaseToast({ city, onOpenProduct }: { city: string; onOpenProduct?: (p: Product) => void }) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let hider: ReturnType<typeof setTimeout>;
    const show = () => {
      const t: Toast = {
        id: Date.now(),
        name: pick(NAMES),
        product: pick(PRODUCTS),
        city: city || "sua região",
        qty: 1 + Math.floor(Math.random() * 3),
      };
      setToast(t);
      hider = setTimeout(() => setToast(null), 6000);
      timer = setTimeout(show, 15000);
    };
    timer = setTimeout(show, 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hider);
    };
  }, [city]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 w-[92%] max-w-md rounded-2xl bg-card border border-border shadow-2xl p-3 flex items-center gap-3"
      style={{ animation: "slideUpFade .4s cubic-bezier(.34,1.56,.64,1)" }}
    >
      <style>{`@keyframes slideUpFade{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
      <div className="h-12 w-12 rounded-xl bg-primary/10 overflow-hidden shrink-0">
        <img src={toast.product.image} alt={toast.product.name} className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          PEDIDO REALIZADO
        </div>
        <div className="text-sm font-bold truncate">{toast.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {toast.qty}x {toast.product.name}
        </div>
        <div className="text-[11px] text-primary font-medium mt-0.5 inline-flex items-center gap-1"><MapPin size={11} /> {toast.city} · agora mesmo</div>
        {onOpenProduct && (
          <button
            onClick={() => {
              onOpenProduct(toast.product);
              setToast(null);
            }}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            Ver produto <ArrowRight size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <button
        aria-label="Fechar"
        onClick={() => setToast(null)}
        className="h-6 w-6 rounded-full hover:bg-secondary grid place-items-center text-muted-foreground"
      >
        <X size={14} strokeWidth={2.25} />
      </button>
    </div>
  );
}