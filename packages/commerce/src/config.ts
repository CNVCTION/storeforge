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
    supabaseStorageBucket: env.SUPABASE_STORAGE_BUCKET ?? "store-assets"
  };
}

function requiredFrom(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required for the active StoreForge integration`);
  return value;
}
