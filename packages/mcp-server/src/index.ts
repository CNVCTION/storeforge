import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

const root = resolve(process.env.STOREFORGE_ROOT ?? process.cwd());
const storeDir = resolve(root, "store");
const specPath = resolve(storeDir, "store-spec.json");
const productsPath = resolve(storeDir, "products.json");

const brandSchema = z.object({
  name: z.string().min(1),
  palette: z.record(z.string(), z.string()).optional(),
  fontDirection: z.string().optional(),
  voice: z.string().optional()
}).passthrough();

const sectionSchema = z.object({
  type: z.string().min(1),
  headline: z.string().optional(),
  body: z.string().optional(),
  asset: z.string().optional(),
  collection: z.string().optional()
}).passthrough();

const storeSpecSchema = z.object({
  schemaVersion: z.string().default("1.0"),
  status: z.enum(["draft", "needs_review", "approved"]).default("draft"),
  brand: brandSchema,
  navigation: z.array(z.string()).default([]),
  homepage: z.array(sectionSchema).default([]),
  approvalRequired: z.array(z.string()).default([
    "prices", "inventory", "shipping", "tax", "payments", "publish"
  ])
}).passthrough();

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  inventory: z.number().int().nonnegative().nullable().optional(),
  images: z.array(z.string()).default([]),
  collection: z.string().optional(),
  status: z.enum(["draft", "needs_review", "approved"]).default("draft")
}).passthrough();

const productsSchema = z.array(productSchema);
type StoreSpec = z.infer<typeof storeSpecSchema>;
type Product = z.infer<typeof productSchema>;

function safePath(path: string): string {
  const candidate = resolve(root, path);
  const rel = relative(root, candidate);
  const separator = process.platform === "win32" ? "\\" : "/";
  if (rel === ".." || rel.startsWith(`..${separator}`)) {
    throw new Error("Path must remain inside the StoreForge root");
  }
  return candidate;
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }]
  };
}

function approvalGates(spec: StoreSpec | null, products: Product[]) {
  const gates = new Set<string>(spec?.approvalRequired ?? [
    "prices", "inventory", "shipping", "tax", "payments", "publish"
  ]);
  const warnings: string[] = [];
  if (products.some((product) => product.price == null)) {
    warnings.push("One or more products have no price; do not infer prices from images.");
    gates.add("prices");
  }
  if (products.some((product) => product.inventory == null)) {
    warnings.push("One or more products have unknown inventory; do not infer stock quantities.");
    gates.add("inventory");
  }
  if (gates.has("payments")) warnings.push("Payments are not activated by this MCP server.");
  if (gates.has("publish")) warnings.push("Publishing requires explicit human approval.");
  return { gates: [...gates], warnings };
}

export function createServer() {
  const server = new McpServer({ name: "storeforge", version: "0.1.0" });

  server.registerTool(
    "storeforge_context",
    {
      title: "Get StoreForge context",
      description: "Read the provider-neutral StoreForge rules and current draft files before making changes.",
      inputSchema: z.object({})
    },
    async () => {
      const readme = await readFile(resolve(root, "README.md"), "utf8").catch(() => "");
      const plan = await readFile(resolve(root, "plan.md"), "utf8").catch(() => "");
      const spec = await readJson<unknown>(specPath, null);
      const products = await readJson<unknown[]>(productsPath, []);
      return textResult({ root, files: { specPath, productsPath }, readme, plan, spec, products });
    }
  );

  server.registerTool(
    "storeforge_write_store_spec",
    {
      title: "Write draft store specification",
      description: "Validate and save a draft StoreSpec. This only writes local draft configuration and never publishes.",
      inputSchema: storeSpecSchema
    },
    async (input) => {
      try {
        const spec = storeSpecSchema.parse({ ...input, status: input.status ?? "draft" });
        await writeJson(specPath, spec);
        return textResult({ ok: true, path: "store/store-spec.json", status: spec.status, approval: approvalGates(spec, []) });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Invalid store specification");
      }
    }
  );

  server.registerTool(
    "storeforge_write_products",
    {
      title: "Write draft products",
      description: "Validate and save draft product records. Unknown business fields must remain null or absent.",
      inputSchema: z.object({ products: productsSchema })
    },
    async ({ products }) => {
      try {
        const parsed = productsSchema.parse(products).map((product) => ({ ...product, status: product.status ?? "draft" }));
        await writeJson(productsPath, parsed);
        const spec = await readJson<StoreSpec | null>(specPath, null);
        return textResult({ ok: true, path: "store/products.json", count: parsed.length, approval: approvalGates(spec, parsed) });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Invalid product list");
      }
    }
  );

  server.registerTool(
    "storeforge_validate",
    {
      title: "Validate StoreForge draft",
      description: "Validate the current draft store specification and products, returning warnings and approval gates.",
      inputSchema: z.object({})
    },
    async () => {
      try {
        const rawSpec = await readJson<unknown>(specPath, null);
        const rawProducts = await readJson<unknown[]>(productsPath, []);
        const specResult = storeSpecSchema.safeParse(rawSpec);
        const productsResult = productsSchema.safeParse(rawProducts);
        const result = {
          valid: specResult.success && productsResult.success,
          files: { spec: "store/store-spec.json", products: "store/products.json" },
          errors: [
            ...(specResult.success ? [] : specResult.error.issues.map((issue) => `store-spec: ${issue.path.join(".")}: ${issue.message}`)),
            ...(productsResult.success ? [] : productsResult.error.issues.map((issue) => `products: ${issue.path.join(".")}: ${issue.message}`))
          ],
          approval: approvalGates(specResult.success ? specResult.data : null, productsResult.success ? productsResult.data : [])
        };
        return result.valid ? textResult(result) : { ...textResult(result), isError: true };
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Validation failed");
      }
    }
  );

  server.registerTool(
    "storeforge_read_file",
    {
      title: "Read a StoreForge file",
      description: "Read a text or JSON file inside the StoreForge root for inspection. Paths cannot escape the repository.",
      inputSchema: z.object({ path: z.string().min(1) })
    },
    async ({ path }) => {
      try {
        const absolute = safePath(path);
        const content = await readFile(absolute, "utf8");
        return textResult({ path, content });
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Unable to read file");
      }
    }
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
