export interface StoreForgeIntegrationConfig {
  commerceProvider: "medusa";
  medusaBaseUrl: string;
  medusaPublishableKey: string;
  medusaRegionId?: string;
  medusaCurrencyCode?: string;
  storefrontBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey: string;
  supabaseStorageBucket: string;
  paymentsProvider: "disabled" | "stripe" | "paypal";
  paymentsLiveEnabled: boolean;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalWebhookId?: string;
  paypalBaseUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the active StoreForge integration`);
  return value;
}

export function loadIntegrationConfig(env: NodeJS.ProcessEnv = process.env): StoreForgeIntegrationConfig {
  if ((env.COMMERCE_PROVIDER ?? "medusa") !== "medusa") {
    throw new Error("StoreForge is configured for the Medusa commerce adapter; change the adapter before selecting another provider");
  }
  const paymentsProvider = env.PAYMENTS_PROVIDER ?? "disabled";
  if (paymentsProvider !== "disabled" && paymentsProvider !== "stripe" && paymentsProvider !== "paypal") {
    throw new Error("PAYMENTS_PROVIDER must be disabled, stripe, or paypal");
  }
  return {
    commerceProvider: "medusa",
    medusaBaseUrl: (env.COMMERCE_BASE_URL ?? "http://localhost:9000").replace(/\/$/, ""),
    medusaPublishableKey: requiredFrom(env, "MEDUSA_PUBLISHABLE_KEY"),
    medusaRegionId: env.MEDUSA_REGION_ID,
    medusaCurrencyCode: env.MEDUSA_CURRENCY_CODE,
    storefrontBaseUrl: (env.STOREFORGE_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    supabaseUrl: requiredFrom(env, "SUPABASE_URL"),
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: requiredFrom(env, "SUPABASE_SERVICE_ROLE_KEY"),
    supabaseStorageBucket: env.SUPABASE_STORAGE_BUCKET ?? "store-assets",
    paymentsProvider,
    paymentsLiveEnabled: env.PAYMENTS_LIVE_ENABLED === "true",
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    paypalClientId: env.PAYPAL_CLIENT_ID,
    paypalClientSecret: env.PAYPAL_CLIENT_SECRET,
    paypalWebhookId: env.PAYPAL_WEBHOOK_ID,
    paypalBaseUrl: env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com"
  };
}

function requiredFrom(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required for the active StoreForge integration`);
  return value;
}
