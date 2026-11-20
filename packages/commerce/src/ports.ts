export type StoreId = string;
export type CustomerId = string;
export type CartId = string;
export type OrderId = string;

export interface Money {
  amount: number;
  currency: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  price?: Money;
  inventory?: number | null;
  images: string[];
  variants?: Array<{ id: string; name: string; sku?: string; price?: Money; inventory?: number | null }>;
}

export interface CartLineInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface Cart {
  id: CartId;
  lines: Array<CartLineInput & { unitPrice?: Money }>;
  subtotal?: Money;
  total?: Money;
  currency: string;
}

export interface CheckoutSession {
  id: string;
  url?: string;
  status: "open" | "complete" | "expired";
  expiresAt?: string;
}

export interface Order {
  id: OrderId;
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  total?: Money;
  providerEventId?: string;
}

export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
}

export interface ShippingOption {
  id: string;
  label: string;
  amount: Money;
  estimatedDays?: { min: number; max: number };
}

export interface TaxQuote {
  amount: Money;
  inclusive: boolean;
  jurisdiction?: string;
  providerReference?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  receivedAt: string;
  payload: unknown;
}

export interface CommercePort {
  getProduct(id: string): Promise<CatalogProduct | null>;
  createCart(input: { storeId: StoreId; customerId?: CustomerId }): Promise<Cart>;
  updateCart(cartId: CartId, lines: CartLineInput[], idempotencyKey: string): Promise<Cart>;
  createCheckoutSession(input: { cartId: CartId; successUrl: string; cancelUrl: string }, idempotencyKey: string): Promise<CheckoutSession>;
  getOrder(id: OrderId): Promise<Order | null>;
  verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
}

export interface ShippingPort {
  quote(input: { cartId: CartId; address: Address }): Promise<ShippingOption[]>;
}

export interface TaxPort {
  quote(input: { cartId: CartId; address: Address }): Promise<TaxQuote>;
}

export interface PaymentPort {
  refund(input: { orderId: OrderId; amount?: Money; reason?: string }, idempotencyKey: string): Promise<{ providerReference: string }>;
}

export interface EmailPort {
  send(input: { to: string; template: string; variables: Record<string, string> }, idempotencyKey: string): Promise<{ providerReference: string }>;
}

export interface AnalyticsPort {
  track(input: { event: string; anonymousId?: string; properties?: Record<string, unknown> }): Promise<void>;
}
