import type { PaymentCheckout, PaymentLineItem, PaymentPort, WebhookEvent, Money, OrderId } from "../ports.js";

export interface PayPalPaymentConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  baseUrl?: string;
}

interface PayPalResponse {
  id?: string;
  status?: string;
  links?: Array<{ href: string; rel: string }>;
  access_token?: string;
  expires_in?: number;
  verification_status?: string;
  name?: string;
  message?: string;
  [key: string]: unknown;
}

export class PayPalPaymentAdapter implements PaymentPort {
  private readonly config: Required<PayPalPaymentConfig>;
  private token?: { value: string; expiresAt: number };

  constructor(config: PayPalPaymentConfig) {
    this.config = { baseUrl: "https://api-m.sandbox.paypal.com", ...config };
  }

  async createCheckoutSession(
    input: { orderId: OrderId; amount: Money; lineItems: PaymentLineItem[]; successUrl: string; cancelUrl: string },
    idempotencyKey: string
  ): Promise<PaymentCheckout> {
    const response = await this.request("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": idempotencyKey },
      body: {
        intent: "CAPTURE",
        purchase_units: [{ reference_id: input.orderId, amount: { currency_code: input.amount.currency.toUpperCase(), value: formatAmount(input.amount.amount) }, items: input.lineItems.map((item) => ({ name: item.name, quantity: String(item.quantity), unit_amount: { currency_code: item.currency.toUpperCase(), value: formatAmount(item.amount) }, category: "PHYSICAL_GOODS" })) }],
        application_context: { return_url: input.successUrl, cancel_url: input.cancelUrl, user_action: "PAY_NOW" }
      }
    });
    if (!response.id) throw new Error("PayPal did not return an order id");
    const approval = response.links?.find((link) => link.rel === "payer-action" || link.rel === "approve");
    return { id: response.id, provider: "paypal", providerReference: response.id, url: approval?.href, status: "open" };
  }

  async capture(input: { paymentId: string }, idempotencyKey: string): Promise<{ providerReference: string; status: string }> {
    const response = await this.request(`/v2/checkout/orders/${encodeURIComponent(input.paymentId)}/capture`, { method: "POST", headers: { "PayPal-Request-Id": idempotencyKey } });
    const captureId = findNestedString(response, ["purchase_units", 0, "payments", "captures", 0, "id"]);
    return { providerReference: captureId ?? String(response.id ?? input.paymentId), status: String(response.status ?? "COMPLETED") };
  }

  async refund(input: { paymentId: string; amount?: Money; reason?: string }, idempotencyKey: string): Promise<{ providerReference: string; status: string }> {
    const body = input.amount ? { amount: { currency_code: input.amount.currency.toUpperCase(), value: formatAmount(input.amount.amount) }, note_to_payer: input.reason } : undefined;
    const response = await this.request(`/v2/payments/captures/${encodeURIComponent(input.paymentId)}/refund`, { method: "POST", headers: { "PayPal-Request-Id": idempotencyKey }, body });
    return { providerReference: String(response.id ?? ""), status: String(response.status ?? "COMPLETED") };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    let headers: Record<string, string>;
    try { headers = JSON.parse(signature) as Record<string, string>; } catch { throw new Error("PayPal webhook signature must be a JSON object of transmission headers"); }
    const requiredHeaders = ["PAYPAL-TRANSMISSION-ID", "PAYPAL-TRANSMISSION-TIME", "PAYPAL-CERT-URL", "PAYPAL-AUTH-ALGO", "PAYPAL-TRANSMISSION-SIG"];
    if (requiredHeaders.some((name) => !headers[name])) throw new Error("Missing PayPal webhook transmission headers");
    const payload = JSON.parse(rawBody) as PayPalResponse;
    const verification = await this.request("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYPAL-TRANSMISSION-ID": headers["PAYPAL-TRANSMISSION-ID"],
        "PAYPAL-TRANSMISSION-TIME": headers["PAYPAL-TRANSMISSION-TIME"],
        "PAYPAL-CERT-URL": headers["PAYPAL-CERT-URL"],
        "PAYPAL-AUTH-ALGO": headers["PAYPAL-AUTH-ALGO"],
        "PAYPAL-TRANSMISSION-SIG": headers["PAYPAL-TRANSMISSION-SIG"]
      },
      body: { auth_algo: headers["PAYPAL-AUTH-ALGO"], cert_url: headers["PAYPAL-CERT-URL"], transmission_id: headers["PAYPAL-TRANSMISSION-ID"], transmission_sig: headers["PAYPAL-TRANSMISSION-SIG"], transmission_time: headers["PAYPAL-TRANSMISSION-TIME"], webhook_id: this.config.webhookId, webhook_event: payload }
    });
    if (verification.verification_status !== "SUCCESS") throw new Error("Invalid PayPal webhook signature");
    return { id: String(payload.id ?? ""), type: String(payload.event_type ?? payload.name ?? "unknown"), receivedAt: new Date().toISOString(), payload };
  }

  private async request(path: string, init: { method: string; headers?: Record<string, string>; body?: unknown }): Promise<PayPalResponse> {
    const token = await this.accessToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, { method: init.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const payload = (await response.json()) as PayPalResponse;
    if (!response.ok) throw new Error(`PayPal API ${response.status}: ${payload.message ?? "request failed"}`);
    return payload;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: "grant_type=client_credentials" });
    const payload = (await response.json()) as PayPalResponse;
    if (!response.ok || !payload.access_token) throw new Error(`PayPal OAuth ${response.status}: ${payload.message ?? "token request failed"}`);
    this.token = { value: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in ?? 900) * 1000 };
    return this.token.value;
  }
}

// StoreForge Money amounts use the provider's minor unit, matching Medusa's unit_price.
function formatAmount(amount: number): string { return (amount / 100).toFixed(2); }
function findNestedString(value: unknown, path: Array<string | number>): string | undefined { let current: any = value; for (const key of path) current = current?.[key]; return typeof current === "string" ? current : undefined; }
