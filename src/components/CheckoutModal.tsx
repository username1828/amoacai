import { useEffect, useMemo, useState } from "react";
import { User, Bike, Home, Zap, Calendar, MapPin, Package, AlertCircle, X, ArrowLeft, Lock } from "lucide-react";
import { formatBRL } from "@/lib/products";

export type CheckoutData = {
  customer: { name: string; phone: string; cpf: string };
  address: {
    cep: string; street: string; number: string; complement: string;
    district: string; city: string; state: string; reference: string;
  };
  delivery_type: "delivery" | "retirada";
  scheduled: boolean;
  delivery_time: string;
  shipping_method: "free" | "express";
  shipping_fee: number;
};

type CartLine = { name: string; qty: number; price: number; oldPrice?: number; notes?: string; selections?: string[] };
type Props = {
  onClose: () => void;
  onComplete: (data: CheckoutData) => void;
  items: CartLine[];
  subtotal: number;
  generalNotes: string;
  embedded?: boolean;
};

const STORAGE_KEY = "amoacai_checkout_v1";
const STEPS = ["Dados", "Entrega", "Endereço", "Resumo"] as const;

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d*)/, "($1");
  if (d.length <= 7) return d.replace(/(\d{2})(\d*)/, "($1) $2");
  return d.replace(/(\d{2})(\d{5})(\d*)/, "($1) $2-$3");
};
const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const maskCEP = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

const validCPF = (cpf: string) => {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const c of base) { sum += parseInt(c) * factor--; }
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(d.slice(0, 9), 10) === +d[9] && calc(d.slice(0, 10), 11) === +d[10];
};

function emptyData(): CheckoutData {
  return {
    customer: { name: "", phone: "", cpf: "" },
    address: { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "", reference: "" },
    delivery_type: "delivery",
    scheduled: false,
    delivery_time: "",
    shipping_method: "free",
    shipping_fee: 0,
  };
}

export function CheckoutModal({ onClose, onComplete, items, subtotal, generalNotes, embedded = false }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CheckoutData>(() => {
    if (typeof window === "undefined") return emptyData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...emptyData(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return emptyData();
  });
  const [showCPF, setShowCPF] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  const isDelivery = data.delivery_type === "delivery";
  const totalSteps = isDelivery ? 4 : 3; // skip endereço se retirada
  const shippingFee = isDelivery && data.shipping_method === "express" ? 5.9 : 0;
  const total = subtotal + shippingFee;
  const oldSubtotal = items.reduce((s, it) => s + (it.oldPrice ?? it.price) * it.qty, 0);
  const savings = Math.max(0, oldSubtotal - subtotal);

  const lookupCEP = async (cep: string) => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setData((p) => ({
          ...p,
          address: {
            ...p.address,
            cep: maskCEP(d),
            street: j.logradouro || p.address.street,
            district: j.bairro || p.address.district,
            city: j.localidade || p.address.city,
            state: j.uf || p.address.state,
          },
        }));
      } else {
        setErrors((e) => ({ ...e, cep: "CEP não encontrado" }));
      }
    } catch { setErrors((e) => ({ ...e, cep: "Falha ao buscar CEP" })); }
    finally { setCepLoading(false); }
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!data.customer.name.trim()) errs.name = "Informe seu nome";
      const ph = data.customer.phone.replace(/\D/g, "");
      if (ph.length < 10) errs.phone = "WhatsApp inválido";
      if (showCPF && !validCPF(data.customer.cpf)) errs.cpf = "CPF inválido";
    }
    if (s === 1) {
      if (data.scheduled && !data.delivery_time) errs.delivery_time = "Escolha data e hora";
    }
    if (s === 2 && isDelivery) {
      const cep = data.address.cep.replace(/\D/g, "");
      if (cep.length !== 8) errs.cep = "CEP inválido";
      if (!data.address.street.trim()) errs.street = "Informe a rua";
      if (!data.address.number.trim()) errs.number = "Número obrigatório";
      if (!data.address.district.trim()) errs.district = "Informe o bairro";
      if (!data.address.city.trim()) errs.city = "Informe a cidade";
      if (!data.address.state.trim()) errs.state = "UF";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    let n = step + 1;
    if (n === 2 && !isDelivery) n = 3; // skip address
    setStep(Math.min(n, 3));
  };
  const back = () => {
    let n = step - 1;
    if (n === 2 && !isDelivery) n = 1;
    setStep(Math.max(0, n));
  };

  const finish = () => {
    if (submitting) return;
    if (!validateStep(0)) { setStep(0); return; }
    if (isDelivery && !validateStep(2)) { setStep(2); return; }
    setSubmitting(true);
    onComplete(data);
  };

  const progressPct = useMemo(() => {
    const visibleStep = !isDelivery && step === 3 ? 2 : step;
    return ((visibleStep + 1) / totalSteps) * 100;
  }, [step, isDelivery, totalSteps]);

  const set = <K extends keyof CheckoutData>(k: K, v: CheckoutData[K]) =>
    setData((p) => ({ ...p, [k]: v }));
  const setC = (k: keyof CheckoutData["customer"], v: string) =>
    setData((p) => ({ ...p, customer: { ...p.customer, [k]: v } }));
  const setA = (k: keyof CheckoutData["address"], v: string) =>
    setData((p) => ({ ...p, address: { ...p.address, [k]: v } }));

  const content = (
    <>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <button onClick={step === 0 ? onClose : back} className="h-9 w-9 grid place-items-center rounded-full hover:bg-secondary" aria-label={step === 0 ? "Fechar" : "Voltar"}>
              {step === 0 ? <X size={18} strokeWidth={2.25} /> : <ArrowLeft size={18} strokeWidth={2.25} />}
            </button>
            <h2 className="text-base font-extrabold">Finalizar pedido</h2>
            <div className="w-9" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">
              {STEPS[step]}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><User size={16} className="text-primary" /> Seus dados</h3>
                <Field label="Nome completo" error={errors.name}>
                  <input value={data.customer.name} onChange={(e) => setC("name", e.target.value)}
                    placeholder="Ex: Maria Silva" className={inp} />
                </Field>
                <Field label="WhatsApp" error={errors.phone}>
                  <input value={data.customer.phone} onChange={(e) => setC("phone", maskPhone(e.target.value))}
                    placeholder="(99) 99999-9999" inputMode="numeric" className={inp} />
                </Field>
                <div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCPF(false)} className={`flex-1 rounded-full py-2.5 text-xs font-semibold border ${!showCPF ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                      Não quero informar
                    </button>
                    <button onClick={() => setShowCPF(true)} className={`flex-1 rounded-full py-2.5 text-xs font-semibold border ${showCPF ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                      Informar CPF
                    </button>
                  </div>
                  {showCPF && (
                    <div className="mt-3">
                      <Field label="CPF" error={errors.cpf}>
                        <input value={data.customer.cpf} onChange={(e) => setC("cpf", maskCPF(e.target.value))}
                          placeholder="000.000.000-00" inputMode="numeric" className={inp} />
                      </Field>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm">Como deseja receber?</h3>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard active={isDelivery} onClick={() => set("delivery_type", "delivery")}
                  icon={<Bike size={26} className="text-primary" />} title="Receber em casa" desc="Entrega rápida" />
                <OptionCard active={!isDelivery} onClick={() => set("delivery_type", "retirada")}
                  icon={<Home size={26} className="text-primary" />} title="Retirar na loja" desc="Sem taxa" />
              </div>
              {isDelivery && (
                <>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <h4 className="font-bold text-sm">Tipo de frete</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => setData((p) => ({ ...p, shipping_method: "free", shipping_fee: 0 }))}
                      className={`rounded-xl p-3 text-left border-2 transition flex items-center justify-between ${data.shipping_method === "free" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary"><Bike size={20} /></span>
                        <div>
                          <div className="font-bold text-sm">Frete grátis</div>
                          <div className="text-[11px] text-muted-foreground">Entrega em 30–40 min</div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-accent">GRÁTIS</span>
                    </button>
                    <button onClick={() => setData((p) => ({ ...p, shipping_method: "express", shipping_fee: 5.9 }))}
                      className={`rounded-xl p-3 text-left border-2 transition flex items-center justify-between ${data.shipping_method === "express" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-full bg-accent/15 grid place-items-center text-accent"><Zap size={20} /></span>
                        <div>
                          <div className="font-bold text-sm">Frete rápido</div>
                          <div className="text-[11px] text-muted-foreground">Entrega em 15–25 min</div>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold">R$ 5,90</span>
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <h4 className="font-bold text-sm">Horário</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => set("scheduled", false)} className={`rounded-xl py-3 text-xs font-semibold border inline-flex items-center justify-center gap-1.5 ${!data.scheduled ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                      <Bike size={14} /> Receber agora
                    </button>
                    <button onClick={() => set("scheduled", true)} className={`rounded-xl py-3 text-xs font-semibold border inline-flex items-center justify-center gap-1.5 ${data.scheduled ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                      <Calendar size={14} /> Agendar horário
                    </button>
                  </div>
                  {data.scheduled && (
                    <Field label="Data e hora" error={errors.delivery_time}>
                      <input type="datetime-local" value={data.delivery_time}
                        onChange={(e) => set("delivery_time", e.target.value)} className={inp} />
                    </Field>
                  )}
                </div>
                </>
              )}
            </div>
          )}

          {step === 2 && isDelivery && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><MapPin size={16} className="text-primary" /> Endereço de entrega</h3>
                <Field label="CEP" error={errors.cep}>
                  <div className="flex gap-2">
                    <input value={data.address.cep} onChange={(e) => {
                      const v = maskCEP(e.target.value);
                      setA("cep", v);
                      if (v.replace(/\D/g, "").length === 8) lookupCEP(v);
                    }} placeholder="00000-000" inputMode="numeric" className={inp} />
                    {cepLoading && <span className="text-xs self-center text-muted-foreground">buscando...</span>}
                  </div>
                </Field>
                <Field label="Rua" error={errors.street}>
                  <input value={data.address.street} onChange={(e) => setA("street", e.target.value)} className={inp} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <Field label="Número" error={errors.number}>
                      <input value={data.address.number} onChange={(e) => setA("number", e.target.value)} className={inp} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Complemento">
                      <input value={data.address.complement} onChange={(e) => setA("complement", e.target.value)} className={inp} />
                    </Field>
                  </div>
                </div>
                <Field label="Bairro" error={errors.district}>
                  <input value={data.address.district} onChange={(e) => setA("district", e.target.value)} className={inp} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Field label="Cidade" error={errors.city}>
                      <input value={data.address.city} onChange={(e) => setA("city", e.target.value)} className={inp} />
                    </Field>
                  </div>
                  <div className="col-span-1">
                    <Field label="UF" error={errors.state}>
                      <input value={data.address.state} onChange={(e) => setA("state", e.target.value.toUpperCase().slice(0, 2))} className={inp} />
                    </Field>
                  </div>
                </div>
                <Field label="Ponto de referência">
                  <input value={data.address.reference} onChange={(e) => setA("reference", e.target.value)}
                    placeholder="Ex: próximo à padaria" className={inp} />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <h3 className="font-bold text-sm flex items-center gap-2"><Package size={16} className="text-primary" /> Itens</h3>
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.qty}x {it.name}</div>
                      {it.selections && it.selections.length > 0 && (
                        <div className="text-[11px] text-muted-foreground truncate">{it.selections.join(", ")}</div>
                      )}
                      {it.notes && <div className="text-[11px] text-muted-foreground italic">Obs: {it.notes}</div>}
                    </div>
                    <div className="shrink-0 ml-2 text-right">
                      {it.oldPrice && it.oldPrice > it.price && (
                        <div className="text-[10px] text-muted-foreground line-through leading-none">
                          {formatBRL(it.oldPrice * it.qty)}
                        </div>
                      )}
                      <div className="font-semibold">{formatBRL(it.price * it.qty)}</div>
                    </div>
                  </div>
                ))}
                {generalNotes && (
                  <div className="pt-2 border-t border-border text-[11px] text-muted-foreground italic">Obs geral: {generalNotes}</div>
                )}
                <div className="pt-2 border-t border-border space-y-1">
                  {savings > 0 && (
                    <Row label="De" value={formatBRL(oldSubtotal)} />
                  )}
                  <Row label="Subtotal" value={formatBRL(subtotal)} />
                  {savings > 0 && (
                    <Row label="Você economiza" value={formatBRL(savings)} accent />
                  )}
                  <Row label="Entrega" value={isDelivery ? (data.shipping_method === "express" ? `${formatBRL(5.9)} · 15–25 min` : "Grátis · 30–40 min") : "Retirada"} accent />
                  <Row label="Total" value={formatBRL(total)} bold />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5 text-sm">
                <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><User size={16} className="text-primary" /> Cliente</h3>
                <div><span className="text-muted-foreground">Nome:</span> {data.customer.name}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> {data.customer.phone}</div>
                {showCPF && data.customer.cpf && (<div><span className="text-muted-foreground">CPF:</span> {data.customer.cpf}</div>)}
              </div>
              {isDelivery && (
                <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1">
                  <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><MapPin size={16} className="text-primary" /> Entrega</h3>
                  <div>{data.address.street}, {data.address.number}{data.address.complement ? ` - ${data.address.complement}` : ""}</div>
                  <div>{data.address.district} · {data.address.city}/{data.address.state}</div>
                  <div className="text-muted-foreground">CEP {data.address.cep}</div>
                  {data.address.reference && <div className="text-muted-foreground">Ref: {data.address.reference}</div>}
                  <div className="pt-1 text-xs inline-flex items-center gap-1.5">
                    {data.scheduled
                      ? (<><Calendar size={12} /> Agendado: {data.delivery_time}</>)
                      : (<><Bike size={12} /> Receber agora</>)}
                  </div>
                </div>
              )}
              {/* Trust badges (mobile/embedded only — desktop shows them outside) */}
              <div className="lg:hidden rounded-2xl border border-border bg-card p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <TrustMini icon={<Lock size={20} />} title="Pagamento seguro" desc="Criptografado" />
                  <TrustMini icon={<Zap size={20} />} title="PIX instantâneo" desc="Aprovação em segundos" />
                  <TrustMini icon={<Bike size={20} />} title="Entrega rápida" desc="25 a 40 min" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {step < 3 ? (
            <button onClick={next} className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition">
              Continuar
            </button>
          ) : (
            <button onClick={finish} disabled={submitting}
              className="w-full rounded-full bg-accent py-3.5 text-sm font-extrabold text-accent-foreground hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60">
              {submitting ? "Gerando PIX..." : `Gerar PIX · ${formatBRL(total)}`}
            </button>
          )}
        </div>
    </>
  );

  return embedded ? (
    <div className="w-full bg-card rounded-3xl border border-border shadow-sm flex flex-col overflow-hidden">{content}</div>
  ) : (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh]">{content}</div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
      {error && <div className="text-[11px] text-destructive mt-1 inline-flex items-center gap-1"><AlertCircle size={12} /> {error}</div>}
    </label>
  );
}

function OptionCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-2xl p-4 text-left border-2 transition ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
      <div className="h-12 w-12 rounded-full bg-primary/10 grid place-items-center">{icon}</div>
      <div className="mt-2 font-bold text-sm">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </button>
  );
}

function TrustMini({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-2xl bg-secondary/40 p-3 border border-transparent transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:bg-card hover:border-border hover:shadow-lg hover:shadow-primary/10 cursor-default">
      <div className="mx-auto h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 border border-border grid place-items-center text-primary shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg]">{icon}</div>
      <div className="text-[11px] font-extrabold mt-2 leading-tight">{title}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{desc}</div>
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-extrabold pt-1" : "text-sm"}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={accent ? "text-accent font-semibold" : ""}>{value}</span>
    </div>
  );
}