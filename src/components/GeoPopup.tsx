import { useEffect, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";

type Loc = { city: string; state: string; eta: string };

const STATE_MAP: Record<string, string> = {
  Acre: "AC", Alagoas: "AL", "Amapá": "AP", Amazonas: "AM", Bahia: "BA",
  "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", "Pará": "PA",
  "Paraíba": "PB", "Paraná": "PR", Pernambuco: "PE", "Piauí": "PI",
  "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", Roraima: "RR",
  "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
};

function normState(state: string) {
  if (!state) return "";
  return (STATE_MAP[state] || state).toUpperCase().slice(0, 2);
}

const timeout = (ms: number) =>
  new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
const geoFetch = (url: string) =>
  Promise.race([fetch(url).then((r) => r.json()), timeout(4500)]) as Promise<any>;

const APIS: Array<() => Promise<{ city: string; state: string }>> = [
  async () => {
    const d = await geoFetch("https://get.geojs.io/v1/ip/geo.json");
    if (!d.city) throw new Error();
    return { city: d.city, state: d.region_code || d.region || "" };
  },
  async () => {
    const d = await geoFetch("https://ipapi.co/json/");
    if (d.error) throw new Error();
    return { city: d.city, state: d.region_code };
  },
  async () => {
    const d = await geoFetch("https://ipinfo.io/json");
    if (!d.city) throw new Error();
    return { city: d.city, state: d.region };
  },
];

export function GeoPopup({ onResolved }: { onResolved?: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loc, setLoc] = useState<Loc>({ city: "sua cidade", state: "", eta: "25 a 40 min" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const minT = Math.floor(Math.random() * 6) + 25;
      const maxT = minT + Math.floor(Math.random() * 6) + 10;
      const eta = `${minT} a ${maxT} min`;
      for (const api of APIS) {
        try {
          const { city, state } = await api();
          if (!city) continue;
          if (cancelled) return;
          const st = normState(state);
          const label = st ? `${city}/${st}` : city;
          setLoc({ city, state: st, eta });
          onResolved?.(label);
          setOpen(true);
          return;
        } catch {
          continue;
        }
      }
      if (!cancelled) {
        setLoc({ city: "sua região", state: "", eta });
        setOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onResolved]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 280);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        opacity: closing ? 0 : 1,
        transition: "opacity .3s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg,#1a0a2e 0%,#2d1060 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 28,
          padding: "36px 28px 28px",
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          animation: "geoPopupIn .4s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <style>{`@keyframes geoPopupIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
        <button
          aria-label="Fechar"
          onClick={close}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer", color: "rgba(255,255,255,0.6)",
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ×
        </button>
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 99, margin: "0 auto 24px" }} />
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-.02em" }}>
          O melhor açaí de<br />
          <span style={{ color: "#c4b5fd" }}>{loc.city}</span> na sua porta!
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 24px", lineHeight: 1.6 }}>
          Peça agora e receba fresquinho, do jeitinho que você gosta.
        </p>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,.92)", color: "#1a1030",
            fontSize: 13, fontWeight: 600,
            padding: "8px 16px", borderRadius: 99, marginBottom: 24,
            boxShadow: "0 2px 12px rgba(0,0,0,.25)",
          }}
        >
          <MapPin size={14} color="#7c3aed" />
          Entrega rápida · {loc.eta}
        </div>
        <button
          onClick={close}
          style={{
            width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: "pointer",
            background: "#fff", color: "#7c3aed",
            fontSize: 15, fontWeight: 900,
            boxShadow: "0 4px 16px rgba(0,0,0,.2)",
            letterSpacing: "0.2px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>Ver Cardápio <ArrowRight size={16} strokeWidth={2.5} /></span>
        </button>
        <button
          onClick={close}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,.4)",
            fontSize: 13, cursor: "pointer", marginTop: 10,
            display: "block", width: "100%", textAlign: "center", padding: 4,
          }}
        >
          Não é minha cidade?
        </button>
      </div>
    </div>
  );
}