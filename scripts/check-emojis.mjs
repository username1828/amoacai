#!/usr/bin/env node
/**
 * Falha o build se encontrar:
 *  - qualquer caractere Extended_Pictographic em src/ (emojis)
 *  - símbolos usados como pseudo-ícones (✕ ✓ ✔ ✘ ← → ↑ ↓ ‹ › « »)
 *
 * A intenção é forçar o uso de ícones SVG da biblioteca (lucide-react).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname;
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);

// \p{Extended_Pictographic} cobre emojis. Adicionamos dingbats/arrows comuns
// que costumam ser usados como ícones improvisados.
// Permitidos: ©, ®, ™ (símbolos jurídicos, não decorativos).
const ALLOWLIST = new Set(["©", "®", "™"]);
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const PSEUDO_ICON_RE = /[\u2715\u2713\u2714\u2718\u2190\u2192\u2191\u2193\u2039\u203A\u00AB\u00BB]/;

const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(full);
      continue;
    }
    const ext = name.slice(name.lastIndexOf("."));
    if (!EXTS.has(ext)) continue;
    const src = readFileSync(full, "utf8");
    src.split(/\r?\n/).forEach((line, idx) => {
      const emojis = [...line.matchAll(EMOJI_RE)].map((m) => m[0]).filter((c) => !ALLOWLIST.has(c));
      const pseudo = line.match(PSEUDO_ICON_RE);
      if (emojis.length > 0 || pseudo) {
        offenders.push({
          file: relative(process.cwd(), full),
          line: idx + 1,
          char: emojis[0] ?? pseudo?.[0] ?? "?",
          kind: emojis.length > 0 ? "emoji" : "pseudo-icon",
          preview: line.trim().slice(0, 120),
        });
      }
    });
  }
}

walk(ROOT);

if (offenders.length > 0) {
  console.error("\n✗ check-emojis: encontrei caracteres não permitidos em src/");
  console.error("  Use componentes SVG de lucide-react (via <Icon />) no lugar.\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  [${o.kind} "${o.char}"]  ${o.preview}`);
  }
  console.error(`\nTotal: ${offenders.length} ocorrência(s).\n`);
  process.exit(1);
}

console.log("✓ check-emojis: nenhum emoji ou pseudo-ícone encontrado em src/.");