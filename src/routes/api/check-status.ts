import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/check-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const apiKey = process.env.PARADISE_API_KEY || process.env.API_KEY;
        if (!apiKey) {
          return Response.json({ status: "pending" }, { headers: CORS });
        }
        const url = new URL(request.url);
        const hash = url.searchParams.get("hash");
        if (!hash) {
          return Response.json({ error: "missing hash" }, { status: 400, headers: CORS });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const resp = await fetch(
            `https://multi.paradisepags.com/api/v1/check_status.php?hash=${encodeURIComponent(hash)}`,
            {
              method: "GET",
              headers: { "X-API-Key": apiKey, Accept: "application/json" },
              signal: controller.signal,
            },
          );
          clearTimeout(timeout);
          const text = await resp.text();
          let data: Record<string, unknown> = {};
          try { data = JSON.parse(text); } catch { /* keep raw */ }

          const raw = String(
            (data.status as string) ?? (data.payment_status as string) ?? text ?? "",
          ).toLowerCase();
          const isPaid = ["paid", "approved", "completed", "succeeded", "success"].some((s) => raw.includes(s));
          return Response.json({ status: isPaid ? "paid" : "pending" }, { headers: CORS });
        } catch (err) {
          clearTimeout(timeout);
          if (process.env.NODE_ENV !== "production") console.error("[paradise] status err", err);
          return Response.json({ status: "pending" }, { headers: CORS });
        }
      },
    },
  },
});