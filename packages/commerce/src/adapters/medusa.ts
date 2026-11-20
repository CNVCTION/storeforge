import { createHmac, timingSafeEqual } from "node:crypto";
import type { Cart, CartLineInput, CatalogProduct, CommercePort, StoreId, CheckoutSession, Order, WebhookEvent } from "../ports.js";
import type { StoreForgeIntegrationConfig } from "../config.js";

type MedusaResponse = Record<string, unknown>;

export class MedusaCommerceAdapter implements CommercePort {
  constructor(private readonly config: StoreForgeIntegrationConfig) {}

  private async request<T extends MedusaResponse>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.medusaBaseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-publishable-api-key": this.config.medusaPublishableKey,
        ...(init.headers ?? {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Medusa request failed (${response.status}): ${JSON.stringify(body)}`);
    }
    return body as T;
  }

  async getProduct(id: string): Promise<CatalogProduct | null> {
    try {
      const result = await this.request<{ product?: Record<string, unknown> }>(`/store/products/${encodeURIComponent(id)}`);
      const product = result.product;
      if (!product) return null;
      return normalizeProduct(product);
    } catch (error) {
      if (error instanceof Error && error.message.includes("(404)")) return null;
      throw error;
    }
  }

  async createCart(input: { storeId: StoreId; customerId?: string }): Promise<Cart> {
    const body: Record<string, unknown> = {};
    if (this.config.medusaRegionId) body.region_id = this.config.medusaRegionId;
    if (this.config.medusaCurrencyCode) body.currency_code = this.config.medusaCurrencyCode;
    if (input.customerId) body.customer_id = input.customerId;
    const result = await this.request<{ cart: Record<string, unknown> }>("/store/carts", {
      method: "POST",
      body: JSON.stringify(body)
    });
    return normalizeCart(result.cart);
  }

  async updateCart(cartId: string, lines: CartLineInput[], idempotencyKey: string): Promise<Cart> {
    let cart: Record<string, unknown> | undefined;
    for (const line of lines) {
      const result = await this.request<{ cart: Record<string, unknown> }>(`/store/carts/${encodeURIComponent(cartId)}/line-items`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ variant_id: line.variantId ?? line.productId, quantity: line.quantity })
      });
      cart = result.cart;
    }
    if (!cart) {
      const result = await this.request<{ cart: Record<string, unknown> }>(`/store/carts/${encodeURIComponent(cartId)}`);
      cart = result.cart;
    }
    return normalizeCart(cart);
  }

  async createCheckoutSession(input: { cartId: string; successUrl: string; cancelUrl: string }, idempotencyKey: string): Promise<CheckoutSession> {
    await this.request<{ cart: Record<string, unknown> }>(`/store/carts/${encodeURIComponent(input.cartId)}/payment-sessions`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({})
    });
    const url = new URL("/checkout", this.config.storefrontBaseUrl);
    url.searchParams.set("cart_id", input.cartId);
    url.searchParams.set("success_url", input.successUrl);
    url.searchParams.set("cancel_url", input.cancelUrl);
    return { id: input.cartId, url: url.toString(), status: "open" };
  }

  async getOrder(id: string): Promise<Order | null> {
    try {
      const result = await this.request<{ order?: Record<string, unknown> }>(`/store/orders/${encodeURIComponent(id)}`);
      if (!result.order) return null;
      const order = result.order;
      return {
        id: String(order.id ?? id),
        status: mapOrderStatus(order),
        total: typeof order.total === "number" ? { amount: order.total, currency: String(order.currency_code ?? "") } : undefined,
        providerEventId: typeof order.metadata === "object" && order.metadata !== null && "provider_event_id" in order.metadata
          ? String(order.metadata.provider_event_id)
          : undefined
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("(404)")) return null;
      throw error;
    }
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    const secret = process.env.MEDUSA_WEBHOOK_SECRET;
    if (!secret) throw new Error("MEDUSA_WEBHOOK_SECRET is required before accepting Medusa webhook events");
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = signature.replace(/^sha256=/, "");
    const valid = provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    if (!valid) throw new Error("Invalid Medusa webhook signature");
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      id: String(payload.id ?? payload.event_id ?? "unknown"),
      type: String(payload.type ?? payload.event ?? "unknown"),
      receivedAt: new Date().toISOString(),
      payload
    };
  }
}

function normalizeProduct(product: Record<string, unknown>): CatalogProduct {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return {
    id: String(product.id),
    name: String(product.title ?? product.name ?? ""),
    description: typeof product.description === "string" ? product.description : undefined,
    images: Array.isArray(product.images) ? product.images.map((image) => typeof image === "string" ? image : String((image as Record<string, unknown>).url ?? "")) : [],
    variants: variants.map((variant) => {
      const item = variant as Record<string, unknown>;
      return { id: String(item.id), name: String(item.title ?? item.name ?? item.id), sku: typeof item.sku === "string" ? item.sku : undefined };
    })
  };
}

function normalizeCart(cart: Record<string, unknown>): Cart {
  const currency = String(cart.currency_code ?? "").toUpperCase();
  const items = Array.isArray(cart.items) ? cart.items : [];
  return {
    id: String(cart.id),
    currency,
    lines: items.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        productId: String(line.product_id ?? line.variant_id ?? ""),
        variantId: typeof line.variant_id === "string" ? line.variant_id : undefined,
        quantity: Number(line.quantity ?? 0),
        unitPrice: typeof line.unit_price === "number" ? { amount: line.unit_price, currency } : undefined
      };
    }),
    subtotal: money(cart.subtotal, currency),
    total: money(cart.total, currency)
  };
}

function money(value: unknown, currency: string) {
  return typeof value === "number" ? { amount: value, currency } : undefined;
}

function mapOrderStatus(order: Record<string, unknown>): Order["status"] {
  const payment = String(order.payment_status ?? "");
  const fulfillment = String(order.fulfillment_status ?? "");
  if (payment === "refunded") return "refunded";
  if (fulfillment === "fulfilled") return "fulfilled";
  if (payment === "captured" || payment === "paid") return "paid";
  if (payment === "canceled" || fulfillment === "canceled") return "cancelled";
  return "pending";
}
