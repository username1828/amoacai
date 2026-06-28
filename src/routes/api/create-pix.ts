import { createFileRoute } from "@tanstack/react-router";
import { generateFakeCustomer } from "@/lib/utils/fakeCustomer";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/create-pix")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const apiKey = process.env.PARADISE_API_KEY || process.env.API_KEY;
        const productHash = process.env.PARADISE_PRODUCT_HASH || process.env.PRODUCT_HASH;
        if (!apiKey || !productHash) {
          return Response.json(
            {
              error: "PIX não configurado",
              message: "Configure PARADISE_API_KEY e PARADISE_PRODUCT_HASH nas variáveis de ambiente do servidor.",
            },
            { status: 500, headers: CORS },
          );
        }

        let body: {
          amount?: number;
          customer?: { name?: string; email?: string; document?: string; phone?: string; cpf?: string };
          address?: Record<string, string>;
          delivery_type?: string;
          scheduled?: boolean;
          delivery_time?: string;
          utm?: Record<string, string>;
        } = {};
        try { body = await request.json(); } catch { /* allow empty */ }

        const amount = Number(String(body.amount).replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) {
          return Response.json({ error: "Invalid amount" }, { status: 400, headers: CORS });
        }
        const amountCents = Math.round(amount * 100);

        const fake = generateFakeCustomer();
        const cpfRaw = (body.customer?.cpf || body.customer?.document || "").replace(/\D/g, "");
        const customer = {
          name: body.customer?.name || fake.name,
          email: body.customer?.email || fake.email,
          document: cpfRaw && cpfRaw.length === 11 ? cpfRaw : fake.document,
          phone: (body.customer?.phone || fake.phone).replace(/\D/g, ""),
        };

        const orderRef = `AMO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const descParts = ["Pedido AmoAçaí"];
        if (body.delivery_type) descParts.push(body.delivery_type === "retirada" ? "Retirada" : "Entrega");
        if (body.customer?.name) descParts.push(body.customer.name);

        const payload = {
          amount: amountCents,
          payment_method: "pix",
          paymentMethod: "PIX",
          description: descParts.join(" · ").slice(0, 120),
          reference: orderRef,
          external_id: orderRef,
          productHash,
          product_hash: productHash,
          products: [
            {
              hash: productHash,
              name: "Pedido AmoAçaí",
              quantity: 1,
              price: amountCents,
            },
          ],
          items: [
            {
              hash: productHash,
              title: "Pedido AmoAçaí",
              quantity: 1,
              unitPrice: amountCents,
              tangible: true,
            },
          ],
          customer: {
            name: customer.name,
            email: customer.email,
            document: customer.document,
            documentType: "CPF",
            phone: customer.phone,
          },
          metadata: {
            delivery_type: body.delivery_type ?? null,
            scheduled: body.scheduled ?? false,
            delivery_time: body.delivery_time ?? null,
            address: body.address ?? null,
            utm: body.utm ?? null,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const resp = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-API-Key": apiKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const text = await resp.text();
          let data: Record<string, unknown> = {};
          try { data = JSON.parse(text); } catch { /* keep raw */ }

          if (!resp.ok) {
            console.error("[paradise] create error", resp.status, text);
            return Response.json({ error: "Falha ao gerar PIX", status: resp.status, details: data, raw: text.slice(0, 500) }, { status: 502, headers: CORS });
          }

          // Try to extract common fields across possible response shapes.
          const pickFirst = (...vals: unknown[]): string | undefined =>
            vals.find((v) => typeof v === "string" && v.length > 0) as string | undefined;

          const root = data as Record<string, unknown>;
          const nested = (root.pix ?? root.data ?? root.transaction ?? root.payment ?? {}) as Record<string, unknown>;
          const pixNode = (root.pix ?? nested.pix ?? nested.payment ?? {}) as Record<string, unknown>;

          const qr_code = pickFirst(
            root.qr_code as string,
            root.pix_code as string,
            root.copy_paste as string,
            root.emv as string,
            nested.qr_code as string,
            nested.pix_code as string,
            nested.copy_paste as string,
            nested.emv as string,
            pixNode.qr_code as string,
            pixNode.pix_code as string,
            pixNode.copy_paste as string,
            pixNode.emv as string,
          );
          const qr_code_image = pickFirst(
            root.qr_code_base64 as string, nested.qr_code_base64 as string,
            root.qr_code_image as string, nested.qr_code_image as string,
            pixNode.qr_code_base64 as string, pixNode.qr_code_image as string,
          );
          const external_id = pickFirst(
            root.transaction_id != null ? String(root.transaction_id) : undefined,
            root.hash != null ? String(root.hash) : undefined,
            root.external_id != null ? String(root.external_id) : undefined,
            root.id as string,
            nested.transaction_id != null ? String(nested.transaction_id) : undefined,
            nested.hash != null ? String(nested.hash) : undefined,
            nested.external_id != null ? String(nested.external_id) : undefined,
            nested.id != null ? String(nested.id) : undefined,
          );
          const expires_at = pickFirst(
            root.expires_at as string, nested.expires_at as string,
          );

          if (!qr_code || !external_id) {
            if (process.env.NODE_ENV !== "production") console.error("[paradise] missing fields", data);
            return Response.json({ error: "Resposta inválida da Paradise", raw: data }, { status: 502, headers: CORS });
          }

          return Response.json(
            {
              qr_code,
              qr_code_image: qr_code_image ?? null,
              external_id,
              amount: amountCents / 100,
              expires_at: expires_at ?? null,
            },
            { headers: CORS },
          );
        } catch (err) {
          clearTimeout(timeout);
          if (process.env.NODE_ENV !== "production") console.error("[paradise] create exception", err);
          return Response.json({ error: "Erro de comunicação com gateway" }, { status: 504, headers: CORS });
        }
      },
    },
  },
});