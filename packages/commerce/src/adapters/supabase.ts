import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoreForgeIntegrationConfig } from "../config.js";

export interface StoreSpecRecord {
  id?: string;
  slug: string;
  name: string;
  schema_version?: string;
  status?: "draft" | "needs_review" | "approved" | "published";
  document: Record<string, unknown>;
}

export interface ProductRecord {
  id?: string;
  store_spec_id: string;
  external_id: string;
  name: string;
  description?: string;
  price?: number | null;
  currency?: string;
  inventory?: number | null;
  status?: "draft" | "needs_review" | "approved" | "published";
  document: Record<string, unknown>;
}

export class SupabaseStoreRepository {
  readonly client: SupabaseClient;

  constructor(private readonly config: StoreForgeIntegrationConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });
  }

  async getStoreSpec(slug: string): Promise<StoreSpecRecord | null> {
    const { data, error } = await this.client.from("store_specs").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`Supabase store spec lookup failed: ${error.message}`);
    return data as StoreSpecRecord | null;
  }

  async upsertStoreSpec(record: StoreSpecRecord): Promise<StoreSpecRecord> {
    const { data, error } = await this.client.from("store_specs").upsert({
      slug: record.slug,
      name: record.name,
      schema_version: record.schema_version ?? "1.0",
      status: record.status ?? "draft",
      document: record.document
    }, { onConflict: "slug" }).select("*").single();
    if (error) throw new Error(`Supabase store spec write failed: ${error.message}`);
    return data as StoreSpecRecord;
  }

  async listProducts(storeSpecId: string): Promise<ProductRecord[]> {
    const { data, error } = await this.client.from("products").select("*").eq("store_spec_id", storeSpecId).order("created_at");
    if (error) throw new Error(`Supabase product lookup failed: ${error.message}`);
    return (data ?? []) as ProductRecord[];
  }

  async upsertProducts(records: ProductRecord[]): Promise<ProductRecord[]> {
    if (records.length === 0) return [];
    const { data, error } = await this.client.from("products").upsert(records, { onConflict: "store_spec_id,external_id" }).select("*");
    if (error) throw new Error(`Supabase product write failed: ${error.message}`);
    return (data ?? []) as ProductRecord[];
  }

  async uploadAsset(path: string, body: ArrayBuffer | Blob | Uint8Array, contentType: string): Promise<string> {
    const { error } = await this.client.storage.from(this.config.supabaseStorageBucket).upload(path, body, {
      contentType,
      upsert: true
    });
    if (error) throw new Error(`Supabase asset upload failed: ${error.message}`);
    const { data } = this.client.storage.from(this.config.supabaseStorageBucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
