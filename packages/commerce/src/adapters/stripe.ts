import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentCheckout, PaymentLineItem, PaymentPort, WebhookEvent, Money, OrderId } from "../ports.js";

export interface StripePaymentConfig {
  secretKey: string;
  webhookSecret: string;
  apiBaseUrl?: string;
  webhookToleranceSeconds?: number;
}

interface StripeResponse {
  id?: string;
  url?: string;
  status?: string;
  payment_intent?: string;
  error?: { message?: string };
  type?: string;
  object?: string;
  data?: unknown;
  [key: string]: unknown;
}

export class StripePaymentAdapter implements PaymentPort {
  private readonly config: Required<StripePaymentConfig>;

  constructor(config: StripePaymentConfig) {
    this.config = {
      apiBaseUrl: "https://api.stripe.com",
      webhookToleranceSeconds: 300,
      ...config
    };
  }

  async createCheckoutSession(
    input: { orderId: OrderId; amount: Money; lineItems: PaymentLineItem[]; successUrl: string; cancelUrl: string },
    idempotencyKey: string
  ): Promise<PaymentCheckout> {
    const body = new URLSearchParams({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orderId,
      "metadata[order_id]": input.orderId
    });
    input.lineItems.forEach((item, index) => {
      body.set(`line_items[${index}][quantity]`, String(item.quantity));
      body.set(`line_items[${index}][price_data][currency]`, item.currency.toLowerCase());
      body.set(`line_items[${index}][price_data][unit_amount]`, String(item.amount));
      body.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    });

    const response = await this.request("/v1/checkout/sessions", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body
    });
    if (!response.id) throw new Error("Stripe did not return a Checkout Session id");
    return {
      id: response.id,
      provider: "stripe",
      providerReference: response.payment_intent as string | undefined,
      url: response.url as string | undefined,
      status: response.status === "complete" ? "complete" : response.status === "expired" ? "expired" : "open"
    };
  }

  async capture(input: { paymentId: string }, idempotencyKey: string): Promise<{ providerReference: string; status: string }> {
    const response = await this.request(`/v1/payment_intents/${encodeURIComponent(input.paymentId)}/capture`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey }
    });
    return { providerReference: String(response.id ?? input.paymentId), status: String(response.status ?? "succeeded") };
  }

  async refund(input: { paymentId: string; amount?: Money; reason?: string }, idempotencyKey: string): Promise<{ providerReference: string; status: string }> {
    const body = new URLSearchParams({ payment_intent: input.paymentId });
    if (input.amount) body.set("amount", String(input.amount.amount));
    if (input.reason === "duplicate" || input.reason === "fraudulent" || input.reason === "requested_by_customer") body.set("reason", input.reason);
    const response = await this.request("/v1/refunds", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body });
    return { providerReference: String(response.id ?? ""), status: String(response.status ?? "pending") };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    const parsed = parseStripeSignature(signature);
    const age = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
    if (age > this.config.webhookToleranceSeconds) throw new Error("Stripe webhook timestamp is outside the tolerance window");
    const expected = createHmac("sha256", this.config.webhookSecret).update(`${parsed.timestamp}.${rawBody}`, "utf8").digest("hex");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const valid = parsed.signatures.some((candidate) => {
      const candidateBuffer = Buffer.from(candidate, "utf8");
      return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
    });
    if (!valid) throw new Error("Invalid Stripe webhook signature");
    const payload = JSON.parse(rawBody) as StripeResponse;
    return { id: String(payload.id ?? ""), type: String(payload.type ?? "unknown"), receivedAt: new Date().toISOString(), payload };
  }

  private async request(path: string, init: { method: string; headers?: Record<string, string>; body?: URLSearchParams }): Promise<StripeResponse> {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.secretKey}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...init.headers
      },
      body: init.body
    });
    const payload = (await response.json()) as StripeResponse;
    if (!response.ok) throw new Error(`Stripe API ${response.status}: ${payload.error?.message ?? "request failed"}`);
    return payload;
  }
}

function parseStripeSignature(signature: string): { timestamp: number; signatures: string[] } {
  const values = new Map<string, string[]>();
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) values.set(key, [...(values.get(key) ?? []), value]);
  }
  const timestamp = Number(values.get("t")?.[0]);
  const signatures = values.get("v1") ?? [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) throw new Error("Malformed Stripe-Signature header");
  return { timestamp, signatures };
}
