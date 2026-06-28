import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_EVENTS = new Set([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "payment_initiated",
  "payment_approved",
]);

export const Route = createFileRoute("/api/tracking")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          if (raw.length > 8192) {
            return Response.json({ error: "payload too large" }, { status: 413, headers: CORS });
          }
          let body: Record<string, unknown> = {};
          try { body = JSON.parse(raw); } catch { /* ignore */ }
          const event = String(body.event ?? "");
          if (!ALLOWED_EVENTS.has(event)) {
            return Response.json({ ok: false, error: "invalid event" }, { status: 400, headers: CORS });
          }
          // Worker logs are durable & filterable. Avoid PII echo beyond what client already sent.
          console.log("[track]", JSON.stringify({
            event,
            ts: body.ts ?? Date.now(),
            url: body.url ?? null,
            referrer: body.referrer ?? null,
            utm: body.utm ?? null,
            data: body.data ?? null,
            ip: request.headers.get("x-forwarded-for") ?? null,
            ua: request.headers.get("user-agent") ?? null,
          }));
          return Response.json({ ok: true }, { headers: CORS });
        } catch (err) {
          console.error("[track] error", err);
          return Response.json({ ok: false }, { status: 200, headers: CORS });
        }
      },
    },
  },
});