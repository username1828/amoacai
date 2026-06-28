import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook público da Paradise PIX.
 * URL: /api/public/webhook  (prefixo /api/public/* dispensa auth da Lovable)
 *
 * Segurança: valida assinatura HMAC-SHA256 quando PARADISE_WEBHOOK_SECRET está
 * configurado. Se não estiver, o evento é aceito mas marcado como "unsigned"
 * para auditoria. Configure o secret em produção.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Signature, X-Paradise-Signature, X-Signature",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 32_768) {
          return new Response("payload too large", { status: 413, headers: CORS });
        }

        const secret = process.env.PARADISE_WEBHOOK_SECRET;
        const provided =
          request.headers.get("x-webhook-signature") ||
          request.headers.get("x-paradise-signature") ||
          request.headers.get("x-signature") ||
          "";

        let signatureStatus: "verified" | "invalid" | "unsigned" = "unsigned";
        if (secret) {
          if (!provided) {
            console.warn("[webhook] missing signature header");
            return new Response("unauthorized", { status: 401, headers: CORS });
          }
          const expected = await hmacSha256Hex(secret, raw);
          const got = provided.replace(/^sha256=/i, "").toLowerCase();
          if (!timingSafeEqualHex(expected, got)) {
            console.warn("[webhook] invalid signature");
            return new Response("invalid signature", { status: 401, headers: CORS });
          }
          signatureStatus = "verified";
        }

        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(raw); } catch { /* keep empty */ }

        const status = String(
          (payload.status as string) ??
            (payload.payment_status as string) ??
            (payload.event as string) ??
            "",
        ).toLowerCase();
        const isPaid = ["paid", "approved", "completed", "succeeded", "success"].some((s) =>
          status.includes(s),
        );
        const txId =
          (payload.transaction_id as string | number | undefined) ??
          (payload.id as string | number | undefined) ??
          (payload.reference as string | undefined) ??
          null;

        console.log("[webhook]", JSON.stringify({
          signatureStatus,
          isPaid,
          status,
          txId,
          receivedAt: new Date().toISOString(),
        }));

        // Sempre ack 200 para evitar reentregas em loop quando o evento já é conhecido.
        return Response.json({ ok: true, signatureStatus }, { headers: CORS });
      },
    },
  },
});