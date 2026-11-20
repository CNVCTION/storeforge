import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { StripePaymentAdapter, PayPalPaymentAdapter } from "../packages/commerce/dist/index.js";

const seen = [];
const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  seen.push({ method: request.method, url: request.url, headers: request.headers, body });
  response.setHeader("content-type", "application/json");
  if (request.url === "/v1/checkout/sessions") return json(response, { id: "cs_test_123", url: "https://checkout.stripe.test/cs_test_123", status: "open", payment_intent: "pi_test_123" });
  if (request.url === "/v1/payment_intents/pi_test_123/capture") return json(response, { id: "pi_test_123", status: "succeeded" });
  if (request.url === "/v1/refunds") return json(response, { id: "re_test_123", status: "succeeded" });
  if (request.url === "/v1/oauth2/token") return json(response, { access_token: "paypal_token", expires_in: 3600 });
  if (request.url === "/v2/checkout/orders") return json(response, { id: "ORDER-123", status: "CREATED", links: [{ rel: "payer-action", href: "https://paypal.test/approve/ORDER-123" }] });
  if (request.url === "/v2/checkout/orders/ORDER-123/capture") return json(response, { id: "ORDER-123", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE-123" }] } }] });
  if (request.url === "/v2/payments/captures/CAPTURE-123/refund") return json(response, { id: "REFUND-123", status: "COMPLETED" });
  if (request.url === "/v1/notifications/verify-webhook-signature") return json(response, { verification_status: "SUCCESS" });
  response.statusCode = 404;
  return json(response, { message: "not found" });
});

function json(response, value) { response.end(JSON.stringify(value)); }
function listen() { return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port))); }

const port = await listen();
const baseUrl = `http://127.0.0.1:${port}`;
try {
  const stripe = new StripePaymentAdapter({ secretKey: "sk_test", webhookSecret: "whsec_test", apiBaseUrl: baseUrl });
  const checkout = await stripe.createCheckoutSession({ orderId: "order-1", amount: { amount: 1200, currency: "usd" }, lineItems: [{ name: "Demo", amount: 1200, currency: "usd", quantity: 1 }], successUrl: "https://store.test/success", cancelUrl: "https://store.test/cancel" }, "idem-stripe-1");
  assert.equal(checkout.id, "cs_test_123");
  assert.equal(checkout.url, "https://checkout.stripe.test/cs_test_123");
  assert.equal((seen.at(-1).headers)["idempotency-key"], "idem-stripe-1");
  assert.match(seen.at(-1).body, /metadata%5Border_id%5D=order-1/);
  assert.deepEqual(await stripe.capture({ paymentId: "pi_test_123" }, "idem-stripe-2"), { providerReference: "pi_test_123", status: "succeeded" });
  assert.deepEqual(await stripe.refund({ paymentId: "pi_test_123" }, "idem-stripe-3"), { providerReference: "re_test_123", status: "succeeded" });

  const stripeBody = JSON.stringify({ id: "evt_123", type: "checkout.session.completed", data: { object: { id: "cs_test_123" } } });
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", "whsec_test").update(`${timestamp}.${stripeBody}`).digest("hex");
  const stripeEvent = await stripe.verifyWebhook(stripeBody, `t=${timestamp},v1=${digest}`);
  assert.equal(stripeEvent.type, "checkout.session.completed");

  const paypal = new PayPalPaymentAdapter({ clientId: "client", clientSecret: "secret", webhookId: "webhook", baseUrl });
  const paypalCheckout = await paypal.createCheckoutSession({ orderId: "order-2", amount: { amount: 2500, currency: "usd" }, lineItems: [{ name: "Demo", amount: 2500, currency: "usd", quantity: 1 }], successUrl: "https://store.test/success", cancelUrl: "https://store.test/cancel" }, "idem-paypal-1");
  assert.equal(paypalCheckout.id, "ORDER-123");
  assert.equal(paypalCheckout.url, "https://paypal.test/approve/ORDER-123");
  assert.match(seen.findLast((entry) => entry.url === "/v2/checkout/orders").body, /25\.00/);
  assert.deepEqual(await paypal.capture({ paymentId: "ORDER-123" }, "idem-paypal-2"), { providerReference: "CAPTURE-123", status: "COMPLETED" });
  assert.deepEqual(await paypal.refund({ paymentId: "CAPTURE-123" }, "idem-paypal-3"), { providerReference: "REFUND-123", status: "COMPLETED" });
  assert.equal(seen.filter((entry) => entry.url === "/v1/oauth2/token").length, 1, "PayPal OAuth token should be cached");

  const paypalBody = JSON.stringify({ id: "WH-123", event_type: "PAYMENT.CAPTURE.COMPLETED" });
  const paypalEvent = await paypal.verifyWebhook(paypalBody, JSON.stringify({ "PAYPAL-TRANSMISSION-ID": "tx", "PAYPAL-TRANSMISSION-TIME": "2026-01-01T00:00:00Z", "PAYPAL-CERT-URL": "https://paypal.test/cert", "PAYPAL-AUTH-ALGO": "SHA256withRSA", "PAYPAL-TRANSMISSION-SIG": "signature" }));
  assert.equal(paypalEvent.type, "PAYMENT.CAPTURE.COMPLETED");
  console.log("Stripe and PayPal mocked payment smoke tests passed");
} finally {
  server.close();
}
